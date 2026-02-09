/**
 * @file TopologyMap.h
 * @brief ææå°å¾è·¯å¾è§åæ¨¡åå¤´æä»¶
 */

#ifndef TOPOLOGY_MAP_H
#define TOPOLOGY_MAP_H

#define MAX_NEIGHBORS 10
#define MAX_PATH_NODES 128

typedef struct {
    int id; /* ID */
    double xStart; /* èµ·ç¹Xåæ  */
    double yStart; /* èµ·ç¹Yåæ  */
    double xEnd; /* ç»ç¹Xåæ  */
    double yEnd; /* ç»ç¹Yåæ  */
    double length; /* é¿åº¦ */
    double gCost; /* Gå¼ */
    double hCost; /* Hå¼ */
    int isInList; /* ç¶ææ è®° 0:None, 1:Open, 2:Closed */
    int father; /* ç¶èç¹ç´¢å¼ */
    int neighborNum; /* é»å±æ°é */
    int neighbors[MAX_NEIGHBORS]; /* é»å±ç´¢å¼æ°ç» */
} AstarNode;

typedef struct {
    int nodeNum; /* èç¹æ»æ° */
    AstarNode* nodes; /* èç¹æ°ç» */
} AstarContext;

typedef struct {
    int id; /* è½¦éID */
    int successorNum; /* åç»§æ°é */
    int successors[MAX_NEIGHBORS]; /* åç»§IDæ°ç» */
} Lane;

typedef struct {
    int id; /* éè·¯ID */
    int laneNum; /* è½¦éæ° */
    Lane* lanes; /* è½¦éæ°ç» */
    int successorNum; /* åç»§éè·¯æ°é */
    int successors[MAX_NEIGHBORS]; /* åç»§éè·¯ID */
} Road;

typedef struct {
    int roadNum; /* éè·¯æ»æ° */
    Road* roads; /* éè·¯æ°ç» */
} TopologyMap;

typedef struct {
    int dummy; /* å ä½ç¬¦ */
} TopoPlanningParam;

typedef struct {
    const char* mapPath; /* å°å¾æä»¶è·¯å¾ */
    int startRoadId; /* èµ·å§éè·¯ID */
    int endRoadId; /* ç»ç¹éè·¯ID */
} TopoPlanningInput;

typedef struct {
    int result; /* ç»æ 0-æå -1-å¤±è´¥ */
    int pathLen; /* è·¯å¾é¿åº¦ */
    int pathNodes[MAX_PATH_NODES]; /* è·¯å¾èç¹IDæ°ç» */
} TopoPlanningOutput;

/**
 * @brief ææå°å¾è·¯å¾è§åä¸»å¥å£
 * @brief Topology Map Path Planning
 */
void runTopologyMapPlanning(const TopoPlanningParam* param, const TopoPlanningInput* input, TopoPlanningOutput* output);

#endif /* TOPOLOGY_MAP_H */