import type { WorkItemField } from '@/services/workItem';

export type FormulaResultType = 'number' | 'text' | 'boolean';

const ALLOWED_REF_TYPES = new Set(['number', 'text', 'textarea', 'rich_text', 'switch', 'single_select']);

export type FormulaCallName = 'IF' | 'SUM' | 'AVG' | 'COUNT' | 'CONCAT' | 'MUL';

const FN = new Set<string>(['IF', 'SUM', 'AVG', 'COUNT', 'CONCAT', 'MUL']);

export type FormulaAst =
  | { kind: 'ref'; key: string }
  | { kind: 'lit'; value: string | number | boolean }
  | { kind: 'call'; name: FormulaCallName; args: FormulaAst[] }
  | { kind: 'binop'; op: '+' | '-' | '*' | '/'; left: FormulaAst; right: FormulaAst }
  | { kind: 'unary'; op: '-'; arg: FormulaAst };

/** 提取 {fieldKey} 引用 */
export function extractFieldRefs(expression: string): string[] {
  const s = expression || '';
  const out: string[] = [];
  const re = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    out.push(m[1]);
  }
  return out;
}

/**
 * 配置保存时：校验引用字段存在、类型允许、非 formula、非自引用。
 * @param selfFieldKey 当前编辑的公式字段 fieldKey（禁止 {self}）
 */
export function validateFormulaReferences(
  expression: string,
  fieldByKey: Record<string, WorkItemField>,
  selfFieldKey?: string,
): string | null {
  const expr = (expression || '').trim();
  if (!expr) return '公式不能为空';
  const refs = extractFieldRefs(expr);
  const seen = new Set<string>();
  for (const key of refs) {
    if (seen.has(key)) continue;
    seen.add(key);
    if (selfFieldKey && key === selfFieldKey) return `公式不能引用自身 {${key}}`;
    const f = fieldByKey[key];
    if (!f) return `未知字段引用 {${key}}（请检查字段标识是否存在）`;
    if (f.fieldType === 'formula') return `第一版不支持引用其他公式字段 {${key}}`;
    if (!ALLOWED_REF_TYPES.has(f.fieldType)) return `第一版不支持引用类型为「${f.fieldType}」的字段 {${key}}`;
  }
  let ast: FormulaAst;
  try {
    ast = parseFormula(expr);
  } catch (e: any) {
    return e?.message || '公式语法无效';
  }
  const astErr = validateFormulaAstShape(ast);
  if (astErr) return astErr;
  try {
    dryRunEval(ast);
  } catch (e: any) {
    return e?.message || '公式无法求值';
  }
  return null;
}

function dryRunEval(node: FormulaAst): void {
  switch (node.kind) {
    case 'ref':
    case 'lit':
      return;
    case 'call':
      node.args.forEach(dryRunEval);
      return;
    case 'binop':
      dryRunEval(node.left);
      dryRunEval(node.right);
      return;
    case 'unary':
      dryRunEval(node.arg);
      return;
    default:
      return;
  }
}

/** 函数参数内不允许再出现函数调用（允许四则与括号）。 */
function noNestedCallInExpr(node: FormulaAst): string | null {
  if (node.kind === 'call') return '第一版不支持在函数参数内嵌套其他函数';
  if (node.kind === 'binop') {
    return noNestedCallInExpr(node.left) || noNestedCallInExpr(node.right);
  }
  if (node.kind === 'unary') {
    return noNestedCallInExpr(node.arg);
  }
  return null;
}

function validateFormulaAstShape(ast: FormulaAst): string | null {
  const visit = (node: FormulaAst): string | null => {
    if (node.kind === 'call') {
      const { name, args } = node;
      if (name === 'IF') {
        if (args.length !== 3) return 'IF 参数个数必须为 3（条件, 真值, 假值）';
      } else if (name === 'MUL') {
        if (args.length < 2) return 'MUL 至少需要 2 个参数（相乘的各个因数）';
      } else if (name === 'AVG') {
        if (args.length < 1) return 'AVG 至少需要 1 个参数';
      } else {
        if (args.length < 1) return `${name} 至少需要 1 个参数`;
      }
      for (const a of args) {
        const nested = noNestedCallInExpr(a);
        if (nested) return nested;
      }
      for (const a of args) {
        const err = visit(a);
        if (err) return err;
      }
      return null;
    }
    if (node.kind === 'binop') {
      return visit(node.left) || visit(node.right);
    }
    if (node.kind === 'unary') {
      return visit(node.arg);
    }
    return null;
  };
  return visit(ast);
}

class Parser {
  private s: string;

  private i = 0;

  constructor(src: string) {
    this.s = src;
  }

  private peek(): string {
    return this.s[this.i] ?? '';
  }

  private skipWs(): void {
    while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i += 1;
  }

  parseAll(): FormulaAst {
    const n = this.parseExpression();
    this.skipWs();
    if (this.i < this.s.length) throw new Error(`公式存在多余内容：「${this.s.slice(this.i, this.i + 20)}…」`);
    return n;
  }

  /** 加减（最低优先级） */
  private parseExpression(): FormulaAst {
    let left = this.parseTerm();
    for (;;) {
      this.skipWs();
      const c = this.peek();
      if (c === '+') {
        this.i += 1;
        const right = this.parseTerm();
        left = { kind: 'binop', op: '+', left, right };
      } else if (c === '-') {
        this.i += 1;
        const right = this.parseTerm();
        left = { kind: 'binop', op: '-', left, right };
      } else {
        break;
      }
    }
    return left;
  }

  /** 乘除 */
  private parseTerm(): FormulaAst {
    let left = this.parseUnary();
    for (;;) {
      this.skipWs();
      const c = this.peek();
      if (c === '*') {
        this.i += 1;
        const right = this.parseUnary();
        left = { kind: 'binop', op: '*', left, right };
      } else if (c === '/') {
        this.i += 1;
        const right = this.parseUnary();
        left = { kind: 'binop', op: '/', left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): FormulaAst {
    this.skipWs();
    if (this.peek() === '+') {
      this.i += 1;
      return this.parseUnary();
    }
    if (this.peek() === '-') {
      this.i += 1;
      const arg = this.parseUnary();
      return { kind: 'unary', op: '-', arg };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): FormulaAst {
    this.skipWs();
    const c = this.peek();
    if (c === '(') {
      this.i += 1;
      const inner = this.parseExpression();
      this.skipWs();
      if (this.peek() !== ')') throw new Error('缺少闭合括号 )');
      this.i += 1;
      return inner;
    }
    if (c === '{') return this.parseRef();
    if (c === '"') return this.parseStr();
    if ((c >= '0' && c <= '9') || c === '.') return this.parseUnsignedNum();
    if (/[a-zA-Z_]/.test(c)) return this.parseCall();
    throw new Error(`无法解析的表达式：「${c || '(空)'}」`);
  }

  private parseRef(): FormulaAst {
    if (this.peek() !== '{') throw new Error('期望字段引用 {key}');
    this.i += 1;
    const start = this.i;
    while (this.i < this.s.length && /[a-zA-Z0-9_]/.test(this.s[this.i])) this.i += 1;
    const key = this.s.slice(start, this.i).trim();
    if (!key || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) throw new Error('字段引用格式无效');
    if (this.peek() !== '}') throw new Error(`字段引用 {${key} 缺少闭合 }`);
    this.i += 1;
    return { kind: 'ref', key };
  }

  private parseStr(): FormulaAst {
    if (this.peek() !== '"') throw new Error('期望字符串 "..."');
    this.i += 1;
    let out = '';
    while (this.i < this.s.length) {
      const ch = this.s[this.i];
      if (ch === '\\') {
        this.i += 1;
        const n = this.s[this.i];
        if (n === '"' || n === '\\') {
          out += n;
          this.i += 1;
        } else {
          out += n ?? '';
          this.i += 1;
        }
        continue;
      }
      if (ch === '"') {
        this.i += 1;
        return { kind: 'lit', value: out };
      }
      out += ch;
      this.i += 1;
    }
    throw new Error('字符串未闭合');
  }

  private parseUnsignedNum(): FormulaAst {
    const start = this.i;
    while (this.i < this.s.length && /[0-9.]/.test(this.s[this.i])) this.i += 1;
    const raw = this.s.slice(start, this.i);
    if (raw === '' || raw === '.') throw new Error('期望数字');
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error(`无效数字「${raw}」`);
    return { kind: 'lit', value: n };
  }

  private readIdent(): string {
    const start = this.i;
    if (!/[a-zA-Z_]/.test(this.peek())) throw new Error('期望函数名');
    while (this.i < this.s.length && /[a-zA-Z0-9_]/.test(this.s[this.i])) this.i += 1;
    return this.s.slice(start, this.i);
  }

  private parseCall(): FormulaAst {
    const ident = this.readIdent();
    const name = ident.toUpperCase();
    if (!FN.has(name)) {
      throw new Error(
        `未知函数「${ident}」，支持 IF、SUM、AVG、COUNT、CONCAT、MUL 以及运算符 + - * / 与括号 ( )`,
      );
    }
    this.skipWs();
    if (this.peek() !== '(') throw new Error(`函数 ${name} 后缺少 (`);
    this.i += 1;
    const args: FormulaAst[] = [];
    this.skipWs();
    if (this.peek() === ')') {
      this.i += 1;
      return { kind: 'call', name: name as FormulaCallName, args };
    }
    for (;;) {
      args.push(this.parseExpression());
      this.skipWs();
      if (this.peek() === ',') {
        this.i += 1;
        this.skipWs();
        continue;
      }
      if (this.peek() === ')') {
        this.i += 1;
        break;
      }
      throw new Error('期望 , 或 )');
    }
    return { kind: 'call', name: name as FormulaCallName, args };
  }
}

export function parseFormula(expression: string): FormulaAst {
  const trimmed = (expression || '').trim();
  if (!trimmed) throw new Error('公式为空');
  return new Parser(trimmed).parseAll();
}

function richTextToPlain(raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  const s = String(raw).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

function normalizeOperand(field: WorkItemField | undefined, raw: unknown): unknown {
  if (!field) return raw;
  switch (field.fieldType) {
    case 'number':
      if (raw === undefined || raw === null || raw === '') return undefined;
      return Number(raw);
    case 'text':
    case 'textarea':
      return raw === undefined || raw === null ? '' : String(raw);
    case 'rich_text':
      return richTextToPlain(raw);
    case 'switch':
      return !!raw;
    case 'single_select':
      return raw === undefined || raw === null ? '' : String(raw);
    default:
      return raw;
  }
}

function toNumber(v: unknown): number {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isCounted(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string' && v.trim() === '') return false;
  if (typeof v === 'number' && !Number.isFinite(v)) return false;
  return true;
}

function isTruthy(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0 && !Number.isNaN(v);
  if (typeof v === 'string') return v.trim() !== '';
  return true;
}

function evalAst(node: FormulaAst, values: Record<string, unknown>, fieldByKey: Record<string, WorkItemField>): unknown {
  switch (node.kind) {
    case 'ref': {
      const f = fieldByKey[node.key];
      return normalizeOperand(f, values[node.key]);
    }
    case 'lit':
      return node.value;
    case 'unary': {
      if (node.op === '-') return -toNumber(evalAst(node.arg, values, fieldByKey));
      return evalAst(node.arg, values, fieldByKey);
    }
    case 'binop': {
      const l = toNumber(evalAst(node.left, values, fieldByKey));
      const r = toNumber(evalAst(node.right, values, fieldByKey));
      switch (node.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          return r === 0 ? 0 : l / r;
        default:
          return 0;
      }
    }
    case 'call': {
      const { name, args } = node;
      if (name === 'SUM') {
        return args.reduce((acc, a) => acc + toNumber(evalAst(a, values, fieldByKey)), 0);
      }
      if (name === 'MUL') {
        return args.reduce((acc, a) => acc * toNumber(evalAst(a, values, fieldByKey)), 1);
      }
      if (name === 'AVG') {
        if (args.length < 1) throw new Error('AVG 至少需要 1 个参数');
        const nums = args.map((a) => toNumber(evalAst(a, values, fieldByKey)));
        return nums.reduce((a, b) => a + b, 0) / nums.length;
      }
      if (name === 'COUNT') {
        return args.filter((a) => isCounted(evalAst(a, values, fieldByKey))).length;
      }
      if (name === 'CONCAT') {
        return args.map((a) => String(evalAst(a, values, fieldByKey) ?? '')).join('');
      }
      if (name === 'IF') {
        if (args.length !== 3) throw new Error('IF 需要 3 个参数：条件, 真值, 假值');
        const cond = evalAst(args[0], values, fieldByKey);
        return isTruthy(cond) ? evalAst(args[1], values, fieldByKey) : evalAst(args[2], values, fieldByKey);
      }
      throw new Error(`未知函数 ${name}`);
    }
    default:
      return undefined;
  }
}

export function evaluateFormula(
  expression: string,
  values: Record<string, unknown>,
  fieldByKey: Record<string, WorkItemField>,
): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    const ast = parseFormula(expression);
    const v = evalAst(ast, values, fieldByKey);
    return { ok: true, value: v };
  } catch (e: any) {
    return { ok: false, error: e?.message || '求值失败' };
  }
}

export function coerceFormulaResult(value: unknown, resultType: FormulaResultType): string | number | boolean {
  if (resultType === 'boolean') return !!value && isTruthy(value);
  if (resultType === 'text') return value === undefined || value === null ? '' : String(value);
  const n = toNumber(value);
  return Number.isFinite(n) ? n : 0;
}
