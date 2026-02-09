/**
 * @file TopologyMapPlanning.cpp
 * @brief ææå°å¾è·¯å¾è§åä¸éåº¦åå§åä¸»ç¨åº
 * @details æ¬æ¨¡åå®ç°äºåºäºææå°å¾çè·¯å¾è§ååè½ï¼å¹¶åæ­¥è§åè½¨è¿¹éåº¦ã
 *          åå«å°å¾è§£æãA*è·¯å¾æç´¢ãè½¦éå¹éä»¥åéåº¦åå§åã
 * @author System Generator
 * @date 2023-10-27
 */

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cmath>
#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <list>
#include <map>
#include <string>

// å¼ç¨å¤é¨XMLè§£æåºï¼æ­¤å¤æ¨¡ærapidxmlæ¥å£ï¼å®éå·¥ç¨éé¾æ¥å¯¹åºåºï¼
// å®éé¡¹ç®ä¸­åºåå« "rapidxml.hpp" ç­å¤´æä»¶
// æ¬æä»¶ä¸ºäºå®æ´æ§ï¼å£°æäºå¿è¦çç»æä½åæ¥å£ã

using namespace std;

// ============================================================
// æ°æ®ç»æå®ä¹
// ============================================================

/**
 * @brief é«æ¯è·¯ç¹
 */
typedef struct {
    double GaussX; /**< é«æ¯åæ X (m) */
    double GaussY; /**< é«æ¯åæ Y (m) */
    double yaw;    /**< èªåè§ (rad) */
    double curvature; /**< æ²ç (1/m) */
} GaussRoadPoint;

/**
 * @brief è½¦éåç»§ä¿¡æ¯
 */
typedef struct {
    int sucRoadID; /**< åç»§è·¯æ®µID */
    int sucLaneID; /**< åç»§è½¦éID */
} LaneSuccessorId;

/**
 * @brief è½¦éä¿¡æ¯
 */
typedef struct {
    int id; /**< è½¦éID */
    std::vector<int> leftLaneId;   /**< å·¦ç¸é»è½¦éIDåè¡¨ */
    std::vector<int> rightLaneId;  /**< å³ç¸é»è½¦éIDåè¡¨ */
    std::vector<LaneSuccessorId> successorId; /**< è½¦éåç»§åè¡¨ */
    std::vector<GaussRoadPoint> gaussRoadPoints; /**< è½¦éè·¯ç¹åè¡¨ */
} Lane;

/**
 * @brief è·¯æ®µä¿¡æ¯
 */
typedef struct {
    int id; /**< è·¯æ®µID */
    std::vector<int> successorId; /**< è·¯æ®µåç»§IDåè¡¨ */
    std::vector<Lane> lanes; /**< è½¦éåè¡¨ */
} Road;

/**
 * @brief ææå°å¾
 */
class Map {
public:
    std::vector<Road> roads; /**< è·¯æ®µåè¡¨ */

    /**
     * @brief è§£æXMLå°å¾æä»¶
     * @param path æä»¶è·¯å¾
     */
    void parseMap(std::string path);

    /**
     * @brief æå°å°å¾èªæ£ä¿¡æ¯
     */
    void printSelfCheck();
};

/**
 * @brief A*ç®æ³èç¹
 */
typedef struct {
    int id;       /**< è·¯æ®µID */
    double xBegin; /**< èµ·ç¹X (m) */
    double yBegin; /**< èµ·ç¹Y (m) */
    double xEnd;   /**< ç»ç¹X (m) */
    double yEnd;   /**< ç»ç¹Y (m) */
    double length; /**< é¿åº¦ (m) */
    std::vector<int> to; /**< è¿æ¥çè·¯æ®µåè¡¨ */
    double g;     /**< Gå¼ */
    double h;     /**< Hå¼ */
    int father;   /**< ç¶èç¹ID */
    int isInList; /**< ç¶ææ è®°ï¼-2æªåå§å, -1å¨closedè¡¨, 0å¨openè¡¨ */
} RoadNode;

/**
 * @brief A*è·¯å¾è§åå¨
 */
class Astar {
public:
    std::map<int, RoadNode> roadList; /**< è·¯æ®µèç¹è¡¨ */
    std::list<RoadNode*> openList;   /**< å¼å¯åè¡¨ */
    int size; /**< è·¯æ®µæ»æ° */
    std::vector<std::pair<int, int>> pathLanes; /**< è§åç»æï¼(RoadID, LaneID) */

    Astar() { size = 0; }

    /**
     * @brief åå§åè·¯æ®µèç¹
     */
    void initRoad(int id, double xB, double yB, double xE, double yE, double len);

    /**
     * @brief åå§åè·¯æ®µè¿æ¥
     */
    void initLink(int from, int to);

    /**
     * @brief æ§è¡è·¯å¾æç´¢
     * @return è·¯å¾IDåè¡¨
     */
    std::list<int> findPath(int origin, int dest);

    /**
     * @brief è·åå®æ´è·¯å¾
     */
    std::list<int> getPath(int origin, int dest);

    /**
     * @brief æ ¹æ®è·¯å¾å¹éè½¦é
     */
    void findLane(Map m, std::list<int> path);

    /**
     * @brief æå°è·¯å¾ç»æ
     */
    void printResult();
};

// ============================================================
// Map ç±»å®ç°
// ============================================================

/**
 * @brief æ¨¡æXMLè§£æè¿ç¨
 * @details å®éå·¥ç¨ä¸­æ­¤å¤ä½¿ç¨rapidxmlè§£æ
 */
void Map::parseMap(std::string path) {
    // æ¨¡ææ°æ®å è½½ï¼å®éåºè°ç¨rapidxmlè§£æpathæåçæä»¶
    // æ­¤å¤ä¸ºäºæ¼ç¤ºä»£ç é»è¾ï¼æå¨æé ç®åå°å¾æ°æ®
    Road r1, r3, r6;
    
    // æé Road 3
    r3.id = 3;
    r3.successorId.push_back(6);
    Lane l3_0;
    l3_0.id = 0;
    GaussRoadPoint p3_start = {0.0, 0.0, 0.0, 0.0};
    GaussRoadPoint p3_end = {10.0, 0.0, 0.0, 0.0};
    l3_0.gaussRoadPoints.push_back(p3_start);
    l3_0.gaussRoadPoints.push_back(p3_end);
    LaneSuccessorId s3_6_1 = {6, 1};
    l3_0.successorId.push_back(s3_6_1);
    r3.lanes.push_back(l3_0);
    
    // æé Road 6
    r6.id = 6;
    Lane l6_1;
    l6_1.id = 1;
    GaussRoadPoint p6_start = {10.0, 0.0, 0.0, 0.0};
    GaussRoadPoint p6_end = {20.0, 0.0, 0.0, 0.0};
    l6_1.gaussRoadPoints.push_back(p6_start);
    l6_1.gaussRoadPoints.push_back(p6_end);
    r6.lanes.push_back(l6_1);

    this->roads.push_back(r3);
    this->roads.push_back(r6);
}

void Map::printSelfCheck() {
    std::cout << "å°å¾å±æ" << roads.size() << "æ¡è·¯æ®µ" << std::endl;
    for (size_t i = 0; i < roads.size(); i++) {
        std::cout << "è·¯æ®µidï¼" << roads[i].id << std::endl;
        for (size_t j = 0; j < roads[i].successorId.size(); j++) {
            std::cout << "åç»§è·¯æ®µidï¼" << roads[i].successorId[j] << std::endl;
        }
        std::cout << "è¯¥è·¯æ®µæ" << roads[i].lanes.size() << "æ¡è½¦é" << std::endl;
        for (size_t j = 0; j < roads[i].lanes.size(); j++) {
            std::cout << "è½¦éid:" << roads[i].lanes[j].id << std::endl;
        }
    }
}

// ============================================================
// Astar ç±»å®ç°
// ============================================================

void Astar::initRoad(int id, double xB, double yB, double xE, double yE, double len) {
    RoadNode node;
    node.id = id;
    node.xBegin = xB;
    node.yBegin = yB;
    node.xEnd = xE;
    node.yEnd = yE;
    node.length = len;
    node.g = 0.0;
    node.h = 0.0;
    node.father = -1;
    node.isInList = -2; // -2: æªåå§å
    
    this->roadList[id] = node;
    this->size = this->size + 1;
}

void Astar::initLink(int from, int to) {
    if (this->roadList.find(from) != this->roadList.end()) {
        this->roadList[from].to.push_back(to);
        this->roadList[from].isInList = 0; // 0: åå§åå®æ/å¨OpenList
    }
}

std::list<int> Astar::findPath(int origin, int dest) {
    std::list<int> path;
    if (this->roadList.find(origin) == this->roadList.end()) {
        std::cout << "éè¯¯ï¼åºåç¹ä¸å­å¨" << std::endl;
        return path;
    }
    if (this->roadList.find(dest) == this->roadList.end()) {
        std::cout << "éè¯¯ï¼ç®çå°ä¸å­å¨" << std::endl;
        return path;
    }

    // åå§åèµ·ç¹
    this->roadList[origin].g = 0;
    // å¯åå¼å½æ°ï¼æ¬§å¼è·ç¦»
    double dx = this->roadList[dest].xBegin - this->roadList[origin].xEnd;
    double dy = this->roadList[dest].yBegin - this->roadList[origin].yEnd;
    this->roadList[origin].h = sqrt(dx*dx + dy*dy);
    this->roadList[origin].father = -1;
    this->roadList[origin].isInList = 0;
    this->openList.push_back(&(this->roadList[origin]));

    RoadNode* currentNode = NULL;
    bool found = false;

    while (!this->openList.empty()) {
        // å¯»æ¾Få¼æå°çèç¹
        std::list<RoadNode*>::iterator it = this->openList.begin();
        std::list<RoadNode*>::iterator minIt = it;
        double minF = (*it)->g + (*it)->h;
        
        for (; it != this->openList.end(); it++) {
            double currentF = (*it)->g + (*it)->h;
            if (currentF < minF) {
                minF = currentF;
                minIt = it;
            }
        }

        currentNode = *minIt;
        
        if (currentNode->id == dest) {
            found = true;
            break;
        }

        // ç§»åºOpenListï¼å å¥ClosedList
        this->openList.erase(minIt);
        currentNode->isInList = -1; // -1: ClosedList

        // éåé»å±
        for (size_t i = 0; i < currentNode->to.size(); i++) {
            int neighborId = currentNode->to[i];
            RoadNode* neighbor = &(this->roadList[neighborId]);

            if (neighbor->isInList == -1) continue; // å·²å¨ClosedList

            double tempG = currentNode->g + neighbor->length;
            bool isGBetter = false;

            if (neighbor->isInList == -2) {
                // æªè¢«è®¿é®è¿
                neighbor->isInList = 0;
                isGBetter = true;
            } else if (tempG < neighbor->g) {
                isGBetter = true;
            }

            if (isGBetter) {
                neighbor->father = currentNode->id;
                neighbor->g = tempG;
                double dx = this->roadList[dest].xBegin - neighbor->xEnd;
                double dy = this->roadList[dest].yBegin - neighbor->yEnd;
                neighbor->h = sqrt(dx*dx + dy*dy);
                if (neighbor->isInList != 0) {
                    this->openList.push_back(neighbor);
                }
            }
        }
    }

    if (found) {
        int temp = currentNode->id;
        while (temp != -1) {
            path.push_front(temp);
            temp = this->roadList[temp].father;
        }
    }
    
    return path;
}

std::list<int> Astar::getPath(int origin, int dest) {
    return findPath(origin, dest);
}

void Astar::findLane(Map m, std::list<int> path) {
    this->pathLanes.clear();
    if (path.size() < 2) return;

    auto it = path.begin();
    auto itNext = path.begin();
    itNext++;

    while (itNext != path.end()) {
        int currentRoadId = *it;
        int nextRoadId = *itNext;
        
        // å¯»æ¾å½åéè·¯
        Road* currentRoad = NULL;
        for (size_t i = 0; i < m.roads.size(); i++) {
            if (m.roads[i].id == currentRoadId) {
                currentRoad = &(m.roads[i]);
                break;
            }
        }
        if (currentRoad == NULL) return;

        // å¯»æ¾è¿æ¥è½¦é
        bool foundLink = false;
        for (size_t i = 0; i < currentRoad->lanes.size(); i++) {
            Lane* lane = &(currentRoad->lanes[i]);
            for (size_t j = 0; j < lane->successorId.size(); j++) {
                LaneSuccessorId link = lane->successorId[j];
                if (link.sucRoadID == nextRoadId) {
                    // æ·»å å½åè½¦é
                    if (this->pathLanes.empty() || this->pathLanes.back().second != lane->id) {
                        this->pathLanes.push_back(std::make_pair(currentRoadId, lane->id));
                    }
                    // æ·»å åç»§è½¦é
                    this->pathLanes.push_back(std::make_pair(nextRoadId, link.sucLaneID));
                    foundLink = true;
                    break;
                }
            }
            if (foundLink) break;
        }

        it++;
        itNext++;
    }
}

void Astar::printResult() {
    std::cout << "è§åè·¯å¾: ";
    for (size_t i = 0; i < this->pathLanes.size(); i++) {
        std::cout << "(Road:" << this->pathLanes[i].first << " Lane:" << this->pathLanes[i].second << ") ";
    }
    std::cout << std::endl;
}

// ============================================================
// éåº¦è§åè¾å©å½æ°ï¼æ¨¡æï¼
// ============================================================

/**
 * @brief è®¡ç®ä¸¤ç¹é´è·ç¦»
 */
double getDistance(double x1, double y1, double x2, double y2) {
    double dx = x1 - x2;
    double dy = y1 - y2;
    return sqrt(dx*dx + dy*dy);
}

/**
 * @brief éåº¦æ¨¡å
 */
double calculateSpeed(double distance, double maxSpeed, double minSpeed, double d1, double d2) {
    if (distance < 0) return minSpeed;
    if (distance < d2) return minSpeed;
    if (distance > d1) return maxSpeed;
    return minSpeed + (maxSpeed - minSpeed) * (distance - d2) / (d1 - d2);
}

/**
 * @brief ç®åçéåº¦åå§åï¼æ¨¡æï¼
 * @details å°è·¯å¾ç¹è½¬åä¸ºç®åçç´çº¿éåº¦è§å
 */
void initSimpleSpeedProfile(Map map, Astar planner, double maxV) {
    if (planner.pathLanes.empty()) return;

    std::cout << "å¼å§åå§åéåº¦ profile..." << std::endl;
    double totalS = 0.0;
    
    // éåææè·¯å¾ä¸çè·¯ç¹ï¼è®¡ç®ç´¯å è·ç¦»å¹¶èµåéåº¦
    // æ­¤å¤ä»åæå°æ¼ç¤ºï¼å®éåºå¡«åTrajectoryç»æ
    for (size_t i = 0; i < planner.pathLanes.size(); i++) {
        int roadId = planner.pathLanes[i].first;
        int laneId = planner.pathLanes[i].second;
        
        // æ¥æ¾å¯¹åºRoad
        for (size_t r = 0; r < map.roads.size(); r++) {
            if (map.roads[r].id == roadId) {
                // æ¥æ¾å¯¹åºLane
                for (size_t l = 0; l < map.roads[r].lanes.size(); l++) {
                    if (map.roads[r].lanes[l].id == laneId) {
                        std::vector<GaussRoadPoint> points = map.roads[r].lanes[l].gaussRoadPoints;
                        for (size_t p = 0; p < points.size() - 1; p++) {
                            double dist = getDistance(points[p].GaussX, points[p].GaussY, 
                                                     points[p+1].GaussX, points[p+1].GaussY);
                            totalS = totalS + dist;
                            // ç®åèµ·è§ï¼åè®¾æ éç¢ç©ï¼ç´æ¥ä½¿ç¨æå¤§éåº¦
                            // å®éé»è¾åºåè inputTrajectorySpeed.cpp ä¸­ç collision check
                            std::cout << "Segment S: " << totalS << " m, Init V: " << maxV << " m/s" << std::endl;
                        }
                        break;
                    }
                }
                break;
            }
        }
    }
}

// ============================================================
// ä¸»å½æ°
// ============================================================

/**
 * @brief ä¸»å¥å£
 * @details æ´åå°å¾è§£æãè·¯å¾è§åä¸éåº¦åå§å
 */
int main() {
    // 1. å°å¾è§£æ
    Map map;
    // åè®¾å°å¾æä»¶å­å¨ï¼å®éè·¯å¾éæ ¹æ®ç¯å¢è°æ´
    std::string mapPath = "./roadMap(1).xodr";
    // å¨æ æä»¶ç¯å¢ä¸ä½¿ç¨æ¨¡ææ°æ®
    map.parseMap(mapPath);
    std::cout << "--- å°å¾èªæ£ ---" << std::endl;
    map.printSelfCheck();

    // 2. åå§åA*è§åå¨
    Astar planner;
    for (auto road : map.roads) {
        if (road.lanes.empty()) continue;
        double xB = road.lanes[0].gaussRoadPoints.front().GaussX;
        double yB = road.lanes[0].gaussRoadPoints.front().GaussY;
        double xE = road.lanes[0].gaussRoadPoints.back().GaussX;
        double yE = road.lanes[0].gaussRoadPoints.back().GaussY;
        double len = getDistance(xB, yB, xE, yE);
        planner.initRoad(road.id, xB, yB, xE, yE, len);

        for (int succId : road.successorId) {
            planner.initLink(road.id, succId);
        }
    }

    // 3. æ§è¡è·¯å¾è§å (ä»Road 3 å° Road 6)
    int originId = 3;
    int destId = 6;
    std::cout << "\n--- è·¯å¾è§å (" << originId << " -> " << destId << ") ---" << std::endl;
    std::list<int> pathNodes = planner.getPath(originId, destId);
    
    if (pathNodes.empty()) {
        std::cout << "æªæ¾å°è·¯å¾" << std::endl;
        return 0;
    }

    std::cout << "è·¯å¾èç¹åºå: ";
    for (int id : pathNodes) {
        std::cout << id << " ";
    }
    std::cout << std::endl;

    // 4. è½¦éçº§å¹é
    planner.findLane(map, pathNodes);
    planner.printResult();

    // 5. éåº¦åå§å (æ¼ç¤ºæµç¨)
    double targetSpeed = 15.0 / 3.6; // 15 km/h -> m/s
    std::cout << "\n--- éåº¦åå§å (ç®æ éåº¦: " << targetSpeed << " m/s) ---" << std::endl;
    initSimpleSpeedProfile(map, planner, targetSpeed);

    return 0;
}