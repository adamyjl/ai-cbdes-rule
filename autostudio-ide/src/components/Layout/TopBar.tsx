import { Car, File, Layout, Hammer, Rocket, Play, Bug, Eye, Box, Settings, Sliders, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

// --- Menu Data ---

const menuData: Record<string, string[]> = {
  '文件': ['新建工程', '打开工程', '保存', '另存为', '导出', '关闭工程', '退出'],
  '画布': ['新建画布', '删除画布', '重命名画布', '画布属性', '网格设置', '缩放'],
  '构建': ['构建工程', '清理构建', '构建设置', '查看构建日志'],
  '部署': ['部署到本地', '部署到远程', '部署配置', '查看部署状态'],
  '运行': ['运行工程', '调试运行', '停止运行', '运行配置'],
  '调测工具': ['性能分析', '内存监控', '网络抓包', '日志分析'],
  '视图管理': ['重置视图', '显示/隐藏侧边栏', '全屏模式', '切换主题'],
  '组件库管理': ['导入组件', '导出组件', '组件版本管理', '组件依赖分析'],
  '配置管理': ['工程配置', '环境配置', '用户配置', '快捷键设置'],
  '设置': ['通用设置', '外观设置', '编辑器设置', '关于']
};

export default function TopBar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="h-10 bg-[#6A1B9A] text-white flex items-center px-4 text-sm select-none shrink-0 relative z-[100]" ref={menuRef}>
      <div className="flex items-center gap-2 mr-6">
        <Car className="w-6 h-6" />
      </div>
      <div className="flex items-center gap-1 h-full">
        {Object.keys(menuData).map((menuName) => (
          <div key={menuName} className="relative h-full flex items-center">
            <div 
              className={clsx(
                "cursor-pointer px-3 h-8 flex items-center rounded hover:bg-white/10 transition-colors",
                activeMenu === menuName && "bg-white/20"
              )}
              onClick={() => setActiveMenu(activeMenu === menuName ? null : menuName)}
            >
              <span>{menuName}</span>
            </div>
            
            {/* Dropdown Menu */}
            {activeMenu === menuName && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white text-gray-800 shadow-lg rounded-md border border-gray-200 py-1 flex flex-col z-50">
                {menuData[menuName].map((item, index) => (
                  <div 
                    key={index} 
                    className="px-4 py-2 hover:bg-[#F3E5F5] hover:text-[#6A1B9A] cursor-pointer text-xs flex items-center justify-between group"
                    onClick={() => {
                      console.log(`Clicked ${menuName} -> ${item}`);
                      setActiveMenu(null);
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
