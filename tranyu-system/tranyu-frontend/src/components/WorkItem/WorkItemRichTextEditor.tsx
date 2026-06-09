import React, { useId, useMemo } from 'react';
import ReactQuill from 'react-quill';
import Quill from 'quill';
import 'react-quill/dist/quill.snow.css';
import './WorkItemRichTextEditor.less';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BlockEmbed = Quill.import('blots/block/embed') as any;

class DividerBlot extends BlockEmbed {
  static blotName = 'divider';

  static tagName = 'hr';
}

try {
  Quill.register(DividerBlot, true);
} catch {
  /* HMR / 重复注册 */
}

export type WorkItemRichTextEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * 工作项 rich_text：基于 Quill（react-quill），输出 HTML 字符串，供 Form 与 workItemFieldMeta 校验复用。
 */
const WorkItemRichTextEditor: React.FC<WorkItemRichTextEditorProps> = ({
  value,
  onChange,
  disabled,
  placeholder,
}) => {
  const rawId = useId().replace(/:/g, '');
  const toolbarId = `work-item-rte-tb-${rawId}`;

  const modules = useMemo(
    () => ({
      toolbar: {
        container: `#${toolbarId}`,
        handlers: {
          undo(this: { quill: Quill }) {
            this.quill.history.undo();
          },
          redo(this: { quill: Quill }) {
            this.quill.history.redo();
          },
          divider(this: { quill: Quill }) {
            const range = this.quill.getSelection(true);
            if (!range) return;
            this.quill.insertEmbed(range.index, 'divider', true, Quill.sources.USER);
            this.quill.setSelection(range.index + 1, Quill.sources.SILENT);
          },
        },
      },
      history: {
        delay: 500,
        maxStack: 100,
        userOnly: true,
      },
    }),
    [toolbarId],
  );

  const formats = useMemo(
    () => [
      'header',
      'bold',
      'italic',
      'underline',
      'strike',
      'color',
      'background',
      'align',
      'list',
      'bullet',
      'ordered',
      'blockquote',
      'code',
      'code-block',
      'link',
      'image',
      'divider',
    ],
    [],
  );

  return (
    <div className={`work-item-rich-text-editor${disabled ? ' work-item-rich-text-editor--disabled' : ''}`}>
      <div id={toolbarId} className="rte-toolbar ql-toolbar ql-snow">
        <span className="ql-formats">
          <button type="button" className="ql-undo" title="撤销" aria-label="撤销">
            ↶
          </button>
          <button type="button" className="ql-redo" title="重做" aria-label="重做">
            ↷
          </button>
        </span>
        <span className="ql-formats">
          <select className="ql-header" defaultValue="" title="标题">
            <option value="">正文</option>
            <option value="1">标题 1</option>
            <option value="2">标题 2</option>
            <option value="3">标题 3</option>
          </select>
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-bold" title="加粗" />
          <button type="button" className="ql-italic" title="斜体" />
          <button type="button" className="ql-underline" title="下划线" />
          <button type="button" className="ql-strike" title="删除线" />
        </span>
        <span className="ql-formats">
          <select className="ql-color" title="文字颜色" />
          <select className="ql-background" title="高亮" />
        </span>
        <span className="ql-formats">
          <select className="ql-align" title="对齐" defaultValue="">
            <option value="" />
            <option value="center" />
            <option value="right" />
            <option value="justify" />
          </select>
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-list" value="ordered" title="有序列表" />
          <button type="button" className="ql-list" value="bullet" title="无序列表" />
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-blockquote" title="引用" />
          <button type="button" className="ql-code" title="行内代码" />
          <button type="button" className="ql-code-block" title="代码块" />
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-link" title="链接" />
          <button type="button" className="ql-image" title="图片（URL）" />
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-divider" title="分割线">
            ─
          </button>
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-clean" title="清除格式" />
        </span>
      </div>
      <ReactQuill
        theme="snow"
        value={value ?? ''}
        onChange={(html) => onChange?.(html)}
        readOnly={!!disabled}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        className="rte-quill"
      />
    </div>
  );
};

export default WorkItemRichTextEditor;
