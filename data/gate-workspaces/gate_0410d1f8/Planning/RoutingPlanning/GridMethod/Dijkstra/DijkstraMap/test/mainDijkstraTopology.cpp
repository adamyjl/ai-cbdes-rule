#include "../../include/dijkstraTopologyMap.h"
#include <iostream>
#include <vector>

using namespace std;

/**
 * @brief 主函数：执行拓扑地图路径规划测试
 * @en_name main
 * @cn_name 主函数
 * @type 函数
 * @param[in] argc 参数个数
 * @param[in] argv 参数列表
 * @var 无
 * @retval 0-程序正常结束
 * @granularity 复合函数
 * @tag_level1 测试入口
 * @tag_level2 主函数
 * @formula 无
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
int main(int argc, const char* argv[]) {
    Map m;
    const char* mapPath = "./roadMap(1).xodr";
    
    // 1. 地图解析
    m.mapAnalysis(mapPath);

    // 2. 转换为A*路网
    Astar astar;
    astar.mapToAstar(m, &astar);

    // 3. 路径规划
    int origin = 3;
    int destination = 6;
    std::list<int> path;
    astar.getPath(origin, destination, &path);

    // 4. 车道查找
    std::list<std::pair<int, int>> pathLanes;
    astar.findLane(m, path, &pathLanes);

    // 5. 结果打印
    m.moduleSelfCheckPrint();
    astar.moduleSelfCheckPrint(pathLanes);

    return 0;
}