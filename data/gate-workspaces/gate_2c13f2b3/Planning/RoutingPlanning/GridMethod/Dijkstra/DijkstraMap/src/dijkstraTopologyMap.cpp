#include "../../include/dijkstraTopologyMap.h"
#include <cmath>
#include <iostream>
#include <algorithm>

using namespace std;

/**
 * @brief 初始化路网节点属性
 * @en_name initRoad
 * @cn_name 初始化路网节点
 * @type 函数
 * @param[out] astar 指向A*算法对象的指针
 * @param[in] number 道路编号
 * @param[in] xStart 起点X坐标
 * @param[in] yStart 起点Y坐标
 * @param[in] xEnd 终点X坐标
 * @param[in] yEnd 终点Y坐标
 * @param[in] length 道路长度
 * @var 无
 * @retval 无
 * @granularity 原子函数
 * @tag_level1 路径规划
 * @tag_level2 拓扑地图
 * @formula 无
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
void Astar::initRoad(Astar* astar, int number, double xStart, double yStart, double xEnd, double yEnd, double length) {
    int index = number;
    astar->roadList[index].id = number;
    astar->roadList[index].xBegin = xStart;
    astar->roadList[index].yBegin = yStart;
    astar->roadList[index].xEnd = xEnd;
    astar->roadList[index].yEnd = yEnd;
    astar->roadList[index].length = length;
    astar->roadList[index].isInList = 0;
    astar->roadList[index].father = -1;
    astar->roadList[index].g = 0.0;
    astar->roadList[index].h = 0.0;
    astar->roadList[index].to.clear();
}

/**
 * @brief 初始化路网连接关系
 * @en_name initLink
 * @cn_name 初始化路网连接
 * @type 函数
 * @param[out] astar 指向A*算法对象的指针
 * @param[in] from 起始道路ID
 * @param[in] to 目标道路ID
 * @var 无
 * @retval 无
 * @granularity 原子函数
 * @tag_level1 路径规划
 * @tag_level2 拓扑地图
 * @formula 无
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
void Astar::initLink(Astar* astar, int from, int to) {
    int fromIndex = from;
    int toIndex = to;
    astar->roadList[fromIndex].to.push_back(toIndex);
}

/**
 * @brief 将地图数据转换为A*路网
 * @en_name mapToAstar
 * @cn_name 地图转A星路网
 * @type 函数
 * @param[in] m 地图对象
 * @param[out] astar 指向A*算法对象的指针
 * @var 无
 * @retval 无
 * @granularity 复合函数
 * @tag_level1 路径规划
 * @tag_level2 拓扑地图
 * @formula 无
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
void Astar::mapToAstar(const Map& m, Astar* astar) {
    int i = 0;
    int roadCount = m.roads.size();
    for (i = 0; i < roadCount; i = i + 1) {
        int number = m.roads[i].id;
        int laneCount = m.roads[i].lanes.size();
        if (laneCount > 0) {
            double xStart = m.roads[i].lanes[0].gaussRoadPoints[0].GaussX;
            double yStart = m.roads[i].lanes[0].gaussRoadPoints[0].GaussY;
            int lastPointIdx = laneCount - 1;
            double xEnd = m.roads[i].lanes[0].gaussRoadPoints[lastPointIdx].GaussX;
            double yEnd = m.roads[i].lanes[0].gaussRoadPoints[lastPointIdx].GaussY;
            double deltaX = xStart - xEnd;
            double deltaY = yStart - yEnd;
            double length = sqrt(deltaX * deltaX + deltaY * deltaY);
            initRoad(astar, number, xStart, yStart, xEnd, yEnd, length);
        }

        int j = 0;
        int succCount = m.roads[i].successorId.size();
        for (j = 0; j < succCount; j = j + 1) {
            int successorId = m.roads[i].successorId[j];
            initLink(astar, number, successorId);
        }
    }
}

/**
 * @brief 启发式函数计算
 * @en_name calcH
 * @cn_name 计算启发值
 * @type 函数
 * @param[in] current 当前节点ID
 * @param[in] end 目标节点ID
 * @param[in] roadList 路网列表
 * @var 无
 * @retval 启发值（欧氏距离）
 * @granularity 原子函数
 * @tag_level1 路径规划
 * @tag_level2 启发式搜索
 * @formula H = sqrt((x1-x2)^2 + (y1-y2)^2)
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
double Astar::calcH(int current, int end, Road* roadList) {
    double xCurrent = roadList[current].xEnd;
    double yCurrent = roadList[current].yEnd;
    double xEnd = roadList[end].xEnd;
    double yEnd = roadList[end].yEnd;
    double deltaX = xCurrent - xEnd;
    double deltaY = yCurrent - yEnd;
    double h = sqrt(deltaX * deltaX + deltaY * deltaY);
    return h;
}

/**
 * @brief 核心路径搜索算法
 * @en_name findPath
 * @cn_name 寻找路径核心
 * @type 函数
 * @param[in] origin 起点ID
 * @param[in] destination 终点ID
 * @var 无
 * @retval 目标节点指针
 * @granularity 复合函数
 * @tag_level1 路径规划
 * @tag_level2 启发式搜索
 * @formula F = G + H
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
Road* Astar::findPath(int origin, int destination) {
    roadList[origin].g = 0;
    roadList[origin].h = calcH(origin, destination, roadList);
    roadList[origin].f = roadList[origin].g + roadList[origin].h;
    roadList[origin].isInList = 1;
    openList.push(roadList[origin]);

    int isFound = 0;

    while (openList.size() > 0) {
        Road currentRoad = openList.top();
        openList.pop();
        int currentId = currentRoad.id;
        roadList[currentId].isInList = 2;

        if (currentId == destination) {
            isFound = 1;
            break;
        }

        int i = 0;
        int neighborCount = roadList[currentId].to.size();
        for (i = 0; i < neighborCount; i = i + 1) {
            int neighborId = roadList[currentId].to[i];
            if (roadList[neighborId].isInList == 2) {
                continue;
            }

            double tempG = roadList[currentId].g + roadList[neighborId].length;
            int isBetter = 0;

            if (roadList[neighborId].isInList == 0) {
                roadList[neighborId].h = calcH(neighborId, destination, roadList);
                roadList[neighborId].isInList = 1;
                isBetter = 1;
            }
            else if (tempG < roadList[neighborId].g) {
                isBetter = 1;
            }
            else {
                isBetter = 0;
            }

            if (isBetter == 1) {
                roadList[neighborId].father = currentId;
                roadList[neighborId].g = tempG;
                roadList[neighborId].f = roadList[neighborId].g + roadList[neighborId].h;
                openList.push(roadList[neighborId]);
            }
        }
    }

    if (isFound == 1) {
        return &(roadList[destination]);
    }
    else {
        return NULL;
    }
}

/**
 * @brief 获取路径节点序列
 * @en_name getPath
 * @cn_name 获取路径
 * @type 函数
 * @param[in] origin 起点ID
 * @param[in] destination 终点ID
 * @param[out] path 存储路径结果的列表
 * @var 无
 * @retval 0-成功 -1-失败
 * @granularity 复合函数
 * @tag_level1 路径规划
 * @tag_level2 拓扑地图
 * @formula 无
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
int Astar::getPath(int origin, int destination, std::list<int>* path) {
    path->clear();

    if (roadList[origin].isInList == -2) {
        cout << "getPath error: Origin node not initialized." << endl;
        return -1;
    }
    if (roadList[destination].isInList == -2) {
        cout << "getPath error: Destination node not initialized." << endl;
        return -1;
    }

    if (origin == destination) {
        path->push_back(destination);
        return 0;
    }

    cout << "A* Pathfinding from " << origin << " to " << destination << endl;
    Road* result = findPath(origin, destination);

    if (result == NULL) {
        cout << "Path not found." << endl;
        return -1;
    }

    int temp = result->father;
    path->push_back(destination);
    path->push_front(temp);

    while (temp != origin) {
        temp = roadList[temp].father;
        path->push_front(temp);
    }

    return 0;
}

/**
 * @brief 根据路径寻找对应车道
 * @en_name findLane
 * @cn_name 寻找车道
 * @type 函数
 * @param[in] m 地图对象
 * @param[in] path 路径节点列表
 * @param[out] pathLanes 路径对应车道列表
 * @var 无
 * @retval 0-成功
 * @granularity 复合函数
 * @tag_level1 路径规划
 * @tag_level2 拓扑地图
 * @formula 无
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
int Astar::findLane(const Map& m, const std::list<int>& path, std::list<std::pair<int, int>>* pathLanes) {
    pathLanes->clear();
    if (path.size() < 2) {
        return -1;
    }

    std::list<int>::const_iterator it = path.begin();
    std::list<int>::const_iterator itNext = path.begin();
    itNext = itNext + 1;

    while (itNext != path.end()) {
        int currentRoadId = *it;
        int nextRoadId = *itNext;
        int i = 0;
        int roadCount = m.roads.size();
        int roadFound = 0;
        Road currentRoad;

        for (i = 0; i < roadCount; i = i + 1) {
            if (m.roads[i].id == currentRoadId) {
                currentRoad = m.roads[i];
                roadFound = 1;
                break;
            }
        }

        if (roadFound == 1) {
            int j = 0;
            int laneCount = currentRoad.lanes.size();
            int foundLane = 0;
            for (j = 0; j < laneCount; j = j + 1) {
                Lane currentLane = currentRoad.lanes[j];
                int k = 0;
                int succCount = currentLane.successorId.size();
                for (k = 0; k < succCount; k = k + 1) {
                    if (currentLane.successorId[k].sucRoadID == nextRoadId) {
                        int lastLaneId = -1;
                        if (pathLanes->size() > 0) {
                            lastLaneId = pathLanes->back().second;
                        }
                        if (currentLane.id != lastLaneId) {
                            pathLanes->push_back(std::make_pair(currentRoadId, currentLane.id));
                        }
                        pathLanes->push_back(std::make_pair(nextRoadId, currentLane.successorId[k].sucLaneID));
                        foundLane = 1;
                        break;
                    }
                }
                if (foundLane == 1) {
                    break;
                }
            }
        }

        it = it + 1;
        itNext = itNext + 1;
    }
    return 0;
}