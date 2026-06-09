/**
 * 模块列表页：根据当前路由从统一模块配置中取表格列与 API，渲染 CrudTable
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'umi';
import type { ProColumns } from '@ant-design/pro-components';
import { CrudTable } from '@/components/CrudTable';
import { getModuleConfig, getModuleKey } from '@/config/modules';
import type { ModuleMeta } from '@/config/modules';
import { fetchBizModuleConfig, type BizField } from '@/services/bizModule';

type BaseRow = Record<string, any>;

const ModuleTable: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const moduleKey = getModuleKey(pathname);
  const baseConfig = getModuleConfig(pathname);
  const [config, setConfig] = useState<ModuleMeta | null>(baseConfig);

  useEffect(() => {
    // 初始使用静态配置
    setConfig(baseConfig);
    // 再尝试从后端加载动态字段配置覆盖列表列
    fetchBizModuleConfig(moduleKey)
      .then((res) => {
        if (!baseConfig) return;
        if (res.code === 0 && res.data && res.data.fields && res.data.fields.length > 0) {
          const listColumns = buildListColumnsFromFields(res.data.fields, baseConfig);
          setConfig({ ...baseConfig, listColumns });
        }
      })
      .catch(() => {
        // 后端无配置时静默回退静态配置
      });
  }, [pathname, moduleKey]);

  function buildListColumnsFromFields(fields: BizField[], base: ModuleMeta): ModuleMeta['listColumns'] {
    const visible = fields.filter((f) => f.showInList === 1);
    if (!visible.length) return base.listColumns;
    return visible
      .sort((a, b) => (a.listSort || 0) - (b.listSort || 0))
      .map((f) => ({
        title: f.fieldName || f.fieldCode,
        dataIndex: f.fieldCode,
        search: true,
        valueType: f.widgetType === 'date' ? 'date' : undefined,
      }));
  }

  const columns: ProColumns<BaseRow>[] = useMemo(() => {
    if (!config) return [];
    return config.listColumns.map((col: ModuleMeta['listColumns'][0]) => ({
      title: col.title,
      dataIndex: col.dataIndex,
      search: col.search !== false,
      valueType: col.valueType,
      valueEnum: col.valueEnum,
      sorter: true,
    }));
  }, [config]);

  if (!config) {
    return null;
  }

  return (
    <CrudTable<BaseRow>
      title={config.title}
      apiBase={config.apiBase}
      listPath={`/${moduleKey}`}
      columns={columns}
      nameField={config.nameField}
    />
  );
};

export default ModuleTable;
