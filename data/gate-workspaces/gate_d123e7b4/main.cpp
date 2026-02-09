/**
 * @file main.cpp
 * @brief 主程序入口，整合路径规划与速度规划流程
 * @details 基于拓扑地图进行路径规划，并将规划结果传递给速度规划模块
 * @version 1.0
 * @date 2023-10-27
 * @author AI Assistant
 */

#include <iostream>
#include <cmath>
#include <vector>
#include <list>
#include <string>
#include <utility>
#include <iterator>



// 结构体定义区域

/**
 * @brief 高斯坐标系下的路点结构
 */
typedef struct {
    double GaussX; /** 高斯X坐标 (m) */
    double GaussY; /** 高斯Y坐标 (m) */
    double yaw;    /** 航向角 (rad) */
    double curvature; /** 曲率 (1/m) */
} GaussRoadPoint;

/**
 * @brief 车道后继ID结构
 */
typedef struct {
    int sucRoadID; /** 后继道路ID */
    int sucLaneID; /** 后继车道ID */
} LaneSuccessorId;

/**
 * @brief 车道结构
 */
typedef struct {
    int id; /** 车道ID */
    std::vector<int> leftLaneId;    /** 左相邻车道ID列表 */
    std::vector<int> rightLaneId;   /** 右相邻车道ID列表 */
    std::vector<LaneSuccessorId> successorId; /** 后继车道ID列表 */
    std::vector<GaussRoadPoint> gaussRoadPoints; /** 车道路点列表 */
} Lane;

/**
 * @brief 道路结构
 */
typedef struct {
    int id; /** 道路ID */
    std::vector<int> successorId; /** 后继道路ID列表 */
    std::vector<Lane> lanes; /** 车道列表 */
} Road;

/**
 * @brief 地图结构
 */
typedef struct {
    std::vector<Road> roads; /** 道路列表 */
} Map;

/**
 * @brief A*算法中的道路节点结构
 */
typedef struct RoadNode {
    int id;         /** 节点ID */
    double xBegin;  /** 起点X坐标 (m) */
    double yBegin;  /** 起点Y坐标 (m) */
    double xEnd;    /** 终点X坐标 (m) */
    double yEnd;    /** 终点Y坐标 (m) */
    double length;  /** 道路长度 (m) */
    double G;       /** G值：从起点到当前点的实际代价 */
    double H;       /** H值：从当前点到终点的启发式代价 */
    double F;       /** F值：G值与H值之和 */
    int father;     /** 父节点ID */
    int isInList;   /** 状态标记：-2未初始化, -1在OpenList, 0在ClosedList */
    std::vector<int> to; /** 邻接节点列表 */
} RoadNode;

/**
 * @brief A*算法类
 */
class Astar {
public:
    RoadNode roadList[100]; /** 节点列表 (假设最多100个节点) */
    int size;               /** 节点数量 */
    std::list<int> openList;/** 开启列表 */
    std::list<int> closedList;/** 关闭列表 */
    std::vector<std::pair<int, int>> pathLanes; /** 结果路径车道列表 <RoadID, LaneID> */

    Astar() {
        int i = 0;
        for (i = 0; i < 100; i = i + 1) {
            roadList[i].isInList = -2;
            roadList[i].G = 0;
            roadList[i].H = 0;
            roadList[i].F = 0;
            roadList[i].father = -1;
        }
        size = 0;
    }

    /**
     * @brief 初始化道路节点
     * @param id 道路ID
     * @param xStart 起点X
     * @param yStart 起点Y
     * @param xEnd 终点X
     * @param yEnd 终点Y
     * @param length 长度
     */
    void initRoad(int id, double xStart, double yStart, double xEnd, double yEnd, double length);

    /**
     * @brief 初始化连接关系
     * @param from 起始ID
     * @param to 终止ID
     */
    void initLink(int from, int to);

    /**
     * @brief 执行路径搜索
     * @param origin 起点
     * @param destination 终点
     * @return 路径节点列表
     */
    std::list<int> getPath(int origin, int destination);

    /**
     * @brief 根据路径确定具体车道
     * @param m 地图对象
     * @param path 路径节点列表
     */
    void findLane(Map m, std::list<int> path);

    /**
     * @brief 将地图数据转换为A*节点
     * @param m 地图对象
     * @param as A*对象指针
     */
    void mapToAstar(Map m, Astar* as);

private:
    /**
     * @brief 计算启发式代价
     */
    double calcH(RoadNode* current, RoadNode* end);

    /**
     * @brief 内部路径搜索实现
     */
    RoadNode* findPath(int origin, int destination);
};

// 辅助函数声明
void printPathLanes(std::vector<std::pair<int, int>> pathLanes);
void executeSpeedPlanning(std::list<int> pathNodes);

// 主函数
int main()
{
    // 实例化地图和A*对象
    Map mapInstance;
    Astar astarInstance;

    // 模拟地图数据加载 (此处省略XML解析，直接模拟数据结构)
    // 实际工程中应调用 Map::mapAnalysis(std::string path)
    Road road1;
    road1.id = 3;
    Road road2;
    road2.id = 6;
    road1.successorId.push_back(6); // 3 -> 6
    mapInstance.roads.push_back(road1);
    mapInstance.roads.push_back(road2);

    // 初始化A*地图节点
    // 模拟坐标和长度
    astarInstance.initRoad(3, 0.0, 0.0, 10.0, 0.0, 10.0);
    astarInstance.initRoad(6, 10.0, 0.0, 20.0, 0.0, 10.0);
    astarInstance.initLink(3, 6);

    // 执行路径规划
    int originId = 3;
    int destinationId = 6;
    std::list<int> pathNodes = astarInstance.getPath(originId, destinationId);

    // 确定具体车道
    astarInstance.findLane(mapInstance, pathNodes);

    // 打印结果
    printPathLanes(astarInstance.pathLanes);

    // 将路径规划结果传递给速度规划模块 (glue logic)
    executeSpeedPlanning(pathNodes);

    return 0;
}

// --- 实现区域 ---

/**
 * @brief 初始化道路节点
 */
void Astar::initRoad(int id, double xStart, double yStart, double xEnd, double yEnd, double length) {
    int index = id; // 简化处理，直接使用ID作为索引
    if (index < 100) {
        roadList[index].id = id;
        roadList[index].xBegin = xStart;
        roadList[index].yBegin = yStart;
        roadList[index].xEnd = xEnd;
        roadList[index].yEnd = yEnd;
        roadList[index].length = length;
        roadList[index].isInList = 0; // 标记为已初始化
        size = size + 1;
    }
}

/**
 * @brief 初始化连接关系
 */
void Astar::initLink(int from, int to) {
    if (from < 100 && to < 100) {
        roadList[from].to.push_back(to);
    }
}

/**
 * @brief 计算启发式代价 (欧氏距离)
 */
double Astar::calcH(RoadNode* current, RoadNode* end) {
    double xDiff = 0.0;
    double yDiff = 0.0;
    double distance = 0.0;
    xDiff = current->xEnd - end->xEnd;
    yDiff = current->yEnd - end->yEnd;
    distance = sqrt(xDiff * xDiff + yDiff * yDiff);
    return distance;
}

/**
 * @brief 内部路径搜索实现
 */
RoadNode* Astar::findPath(int origin, int destination) {
    RoadNode* startNode = &roadList[origin];
    RoadNode* endNode = &roadList[destination];
    std::list<RoadNode*> openListPtr;
    std::list<RoadNode*> closedListPtr;
    
    startNode->G = 0;
    startNode->H = calcH(startNode, endNode);
    startNode->F = startNode->G + startNode->H;
    startNode->father = -1;
    startNode->isInList = -1; // Open
    openListPtr.push_back(startNode);

    RoadNode* currentNode = NULL;
    RoadNode* neighborNode = NULL;
    int neighborId = 0;
    double tempG = 0.0;
    int i = 0;
    int count = 0;

    while (openListPtr.empty() == false) {
        // 寻找F值最小的节点
        currentNode = openListPtr.front();
        for (std::list<RoadNode*>::iterator it = openListPtr.begin(); it != openListPtr.end(); ++it) {
            if ((*it)->F < currentNode->F) {
                currentNode = *it;
            }
        }

        if (currentNode->id == destination) {
            return currentNode;
        }

        openListPtr.remove(currentNode);
        currentNode->isInList = 0; // Closed
        closedListPtr.push_back(currentNode);

        // 遍历邻居
        for (i = 0; i < currentNode->to.size(); i = i + 1) {
            neighborId = currentNode->to[i];
            neighborNode = &roadList[neighborId];

            if (neighborNode->isInList == 0) {
                continue;
            }

            tempG = currentNode->G + neighborNode->length;

            if (neighborNode->isInList != -1) {
                neighborNode->G = tempG;
                neighborNode->H = calcH(neighborNode, endNode);
                neighborNode->F = neighborNode->G + neighborNode->H;
                neighborNode->father = currentNode->id;
                neighborNode->isInList = -1;
                openListPtr.push_back(neighborNode);
            } else {
                if (tempG < neighborNode->G) {
                    neighborNode->G = tempG;
                    neighborNode->F = neighborNode->G + neighborNode->H;
                    neighborNode->father = currentNode->id;
                }
            }
        }
        count = count + 1;
        if (count > 1000) { // 防止死循环
            break;
        }
    }
    return NULL;
}

/**
 * @brief 获取路径
 */
std::list<int> Astar::getPath(int origin, int destination) {
    std::list<int> path;
    if (roadList[origin].isInList == -2) {
        return path;
    }
    if (roadList[destination].isInList == -2) {
        return path;
    }

    if (origin == destination) {
        path.push_back(destination);
        return path;
    }

    RoadNode* result = findPath(origin, destination);
    if (result == NULL) {
        return path;
    }

    int temp = result->father;
    path.push_back(destination);
    path.push_front(temp);
    while (temp != origin) {
        temp = roadList[temp].father;
        path.push_front(temp);
    }
    return path;
}

/**
 * @brief 寻找车道
 */
void Astar::findLane(Map m, std::list<int> path) {
    std::list<int>::iterator it = path.begin();
    std::list<int>::iterator itNext = path.begin();
    itNext = itNext + 1; // 移动到下一个节点
    
    std::vector<Road>::iterator itRoads;
    std::vector<Lane>::iterator itLanes;
    std::vector<LaneSuccessorId>::iterator itSuccessor;
    bool found = false;

    while (itNext != path.end()) {
        itRoads = m.roads.begin();
        found = false;
        // 查找当前Road
        while (itRoads != m.roads.end()) {
            if (itRoads->id == *it) {
                break;
            }
            itRoads = itRoads + 1;
        }

        if (itRoads != m.roads.end()) {
            itLanes = itRoads->lanes.begin();
            while (itLanes != itRoads->lanes.end()) {
                itSuccessor = itLanes->successorId.begin();
                while (itSuccessor != itLanes->successorId.end()) {
                    if (itSuccessor->sucRoadID == *itNext) {
                        if (pathLanes.empty() == true) {
                            pathLanes.push_back(std::make_pair(*it, itLanes->id));
                        } else {
                            if (pathLanes.back().second != itLanes->id) {
                                pathLanes.push_back(std::make_pair(*it, itLanes->id));
                            }
                        }
                        pathLanes.push_back(std::make_pair(*itNext, itSuccessor->sucLaneID));
                        found = true;
                        break;
                    }
                    itSuccessor = itSuccessor + 1;
                }
                if (found == true) {
                    break;
                }
                itLanes = itLanes + 1;
            }
        }
        std::advance(it, 1);
        std::advance(itNext, 1);
    }
}

/**
 * @brief 打印路径车道结果
 */
void printPathLanes(std::vector<std::pair<int, int>> pathLanes) {
    int i = 0;
    std::cout << "Planning Result Path Lanes:" << std::endl;
    for (i = 0; i < pathLanes.size(); i = i + 1) {
        std::cout << "Road ID: " << pathLanes[i].first 
                  << ", Lane ID: " << pathLanes[i].second << std::endl;
    }
}

/**
 * @brief 胶水函数：连接路径规划与速度规划
 * @details 将路径规划结果（节点列表）转换为速度规划的初始化输入参数
 */
void executeSpeedPlanning(std::list<int> pathNodes) {
    // 在实际场景中，这里需要将 pathNodes 转换为 PlanningTrajectory
    // 此处仅做演示，不包含完整的速度规划实现
    std::cout << "Speed Planning Module Started..." << std::endl;
    std::cout << "Path Nodes received: ";
    
    for (std::list<int>::iterator it = pathNodes.begin(); it != pathNodes.end(); ++it) {
        std::cout << *it << " ";
    }
    std::cout << std::endl;
    
    // TODO: 将节点ID转换为坐标点并调用 initSpeedForTrajectory
    // 由于缺乏坐标映射，此处仅输出连接信息
    std::cout << "Converting path to speed profile..." << std::endl;
}