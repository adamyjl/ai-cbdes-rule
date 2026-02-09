/**
 * @file TopologyMap.c
 * @brief ææå°å¾è·¯å¾è§åæ¨¡åå®ç°
 */

#include "TopologyMap.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>

/**
 * @brief è®¡ç®ä¸¤ç¹ä¹é´è·ç¦»
 * @details è®¡ç®é«æ¯åæ ç³»ä¸ä¸¤ç¹ä¹é´çç´çº¿è·ç¦»
 * @param[in] x1 èµ·ç¹Xåæ 
 * @param[in] y1 èµ·ç¹Yåæ 
 * @param[in] x2 ç»ç¹Xåæ 
 * @param[in] y2 ç»ç¹Yåæ 
 * @param[out] distance è·ç¦»å¼
 * @retval void
 * @author system
 * @date 2023-10-27
 */
void calcDistance(const double x1, const double y1, const double x2, const double y2, double* distance)
{
    double dx = 0.0;
    double dy = 0.0;
    dx = x1 - x2;
    dy = y1 - y2;
    *distance = sqrt(dx * dx + dy * dy);
}

/**
 * @brief è§£æå°å¾XMLæä»¶
 * @details ä»OpenDRIVEæ ¼å¼æä»¶ä¸­è¯»åè·¯ç½ææä¿¡æ¯
 * @param[in] filePath æä»¶è·¯å¾
 * @param[out] map è§£æåçå°å¾ç»æä½
 * @retval int 0-æå, -1-å¤±è´¥
 * @author system
 * @date 2023-10-27
 */
int parseTopologyMap(const char* filePath, TopologyMap* map)
{
    int i = 0;
    int j = 0;
    /* æ­¤å¤çç¥XMLè§£æåºçå·ä½è°ç¨ï¼å¦rapidxml */
    /* æ¨¡ææ°æ®å è½½è¿ç¨ */
    map->roadNum = 3;
    map->roads = (Road*)malloc(sizeof(Road) * (size_t)map->roadNum);
    
    if (NULL == map->roads)
    {
        return -1;
    }

    for (i = 0; i < map->roadNum; i++)
    {
        map->roads[i].id = i;
        map->roads[i].laneNum = 1;
        map->roads[i].lanes = (Lane*)malloc(sizeof(Lane) * (size_t)map->roads[i].laneNum);
        
        for (j = 0; j < map->roads[i].laneNum; j++)
        {
            map->roads[i].lanes[j].id = 0;
        }
    }
    
    /* æ¨¡æè¿æ¥å³ç³» */
    map->roads[0].successorNum = 1;
    map->roads[0].successors[0] = 1;
    map->roads[1].successorNum = 1;
    map->roads[1].successors[0] = 2;
    map->roads[2].successorNum = 0;

    return 0;
}

/**
 * @brief åå§åA*ç®æ³è·¯ç½èç¹
 * @details å°å°å¾éè·¯è½¬æ¢ä¸ºç®æ³èç¹
 * @param[in] map ææå°å¾
 * @param[in] astar A*ç®æ³ä¸ä¸æ
 * @retval void
 * @author system
 * @date 2023-10-27
 */
void initAstarNodes(const TopologyMap* map, AstarContext* astar)
{
    int i = 0;
    int roadId = 0;
    double xStart = 0.0;
    double yStart = 0.0;
    double xEnd = 0.0;
    double yEnd = 0.0;
    double length = 0.0;

    astar->nodeNum = map->roadNum;
    astar->nodes = (AstarNode*)malloc(sizeof(AstarNode) * (size_t)astar->nodeNum);

    for (i = 0; i < astar->nodeNum; i++)
    {
        roadId = map->roads[i].id;
        /* æ¨¡æè·ååæ  */
        xStart = (double)(i * 100);
        yStart = 0.0;
        xEnd = (double)((i + 1) * 100);
        yEnd = 0.0;
        
        calcDistance(xStart, yStart, xEnd, yEnd, &length);
        
        astar->nodes[i].id = roadId;
        astar->nodes[i].xStart = xStart;
        astar->nodes[i].yStart = yStart;
        astar->nodes[i].xEnd = xEnd;
        astar->nodes[i].yEnd = yEnd;
        astar->nodes[i].length = length;
        astar->nodes[i].isInList = 0; /* 0:æªå¤ç, 1:Open, 2:Closed */
        astar->nodes[i].gCost = 0.0;
        astar->nodes[i].hCost = 0.0;
        astar->nodes[i].father = -1;
    }
}

/**
 * @brief å»ºç«èç¹è¿æ¥å³ç³»
 * @details æ ¹æ®å°å¾åç»§å³ç³»åå§åA*ç®æ³çé»æ¥è¡¨
 * @param[in] map ææå°å¾
 * @param[in] astar A*ç®æ³ä¸ä¸æ
 * @retval void
 * @author system
 * @date 2023-10-27
 */
void initAstarLinks(const TopologyMap* map, AstarContext* astar)
{
    int i = 0;
    int j = 0;
    int currentId = 0;
    int succId = 0;
    int succIndex = 0;

    for (i = 0; i < map->roadNum; i++)
    {
        currentId = map->roads[i].id;
        astar->nodes[i].neighborNum = map->roads[i].successorNum;
        
        for (j = 0; j < map->roads[i].successorNum; j++)
        {
            succId = map->roads[i].successors[j];
            /* æ¥æ¾åç»§èç¹å¨æ°ç»ä¸­çç´¢å¼ */
            succIndex = -1;
            /* ç®åçº¿æ§æ¥æ¾ï¼å®éå¯ä¼å */
            if (succId < astar->nodeNum)
            {
                succIndex = succId;
            }
            
            if (succIndex >= 0)
            {
                astar->nodes[i].neighbors[j] = succIndex;
            }
        }
    }
}

/**
 * @brief è®¡ç®å¯åå½æ°å¼
 * @details ä½¿ç¨æ¬§æ°è·ç¦»ä½ä¸ºå¯åå½æ°
 * @param[in] node å½åèç¹
 * @param[in] endNode ç»ç¹èç¹
 * @retval double å¯åå¼
 * @author system
 * @date 2023-10-27
 */
double calcHeuristic(const AstarNode* node, const AstarNode* endNode)
{
    double dx = 0.0;
    double dy = 0.0;
    double dist = 0.0;
    dx = node->xEnd - endNode->xStart;
    dy = node->yEnd - endNode->yStart;
    dist = sqrt(dx * dx + dy * dy);
    return dist;
}

/**
 * @brief æ§è¡A*ç®æ³æç´¢è·¯å¾
 * @details æ ¸å¿è·¯å¾æç´¢é»è¾
 * @param[in] startId èµ·å§éè·¯ID
 * @param[in] endId ç»ç¹éè·¯ID
 * @param[in] astar A*ç®æ³ä¸ä¸æ
 * @param[out] path è·¯å¾èç¹ç´¢å¼æ°ç»
 * @param[out] pathLen è·¯å¾é¿åº¦
 * @retval int 0-æå, -1-å¤±è´¥
 * @author system
 * @date 2023-10-27
 */
int findPathAstar(const int startId, const int endId, AstarContext* astar, int* path, int* pathLen)
{
    int currentIndex = 0;
    int endIndex = 0;
    int minCostIndex = 0;
    int i = 0;
    int neighborIndex = 0;
    double gCost = 0.0;
    double hCost = 0.0;
    double totalCost = 0.0;
    int tempPath[128] = {0}; /* ç¨äºåæº¯è·¯å¾ */
    int tempLen = 0;
    int father = 0;
    int isOpenListEmpty = 0;
    double minF = 0.0;

    /* æ¾å°ç»ç¹ç´¢å¼ */
    endIndex = -1;
    if (endId < astar->nodeNum)
    {
        endIndex = endId;
    }
    
    if ((startId < 0) || (endIndex < 0))
    {
        return -1;
    }

    /* åå§åèµ·ç¹ */
    currentIndex = startId;
    astar->nodes[currentIndex].isInList = 1; /* å å¥OpenList */
    astar->nodes[currentIndex].gCost = 0.0;
    astar->nodes[currentIndex].hCost = calcHeuristic(&astar->nodes[currentIndex], &astar->nodes[endIndex]);

    isOpenListEmpty = 0;
    
    while (0 == isOpenListEmpty)
    {
        /* å¯»æ¾OpenListä¸­Få¼æå°çèç¹ */
        minCostIndex = -1;
        minF = 1e10;
        
        for (i = 0; i < astar->nodeNum; i++)
        {
            if (1 == astar->nodes[i].isInList)
            {
                totalCost = astar->nodes[i].gCost + astar->nodes[i].hCost;
                if (totalCost < minF)
                {
                    minF = totalCost;
                    minCostIndex = i;
                }
            }
        }
        
        if (-1 == minCostIndex)
        {
            isOpenListEmpty = 1;
            continue;
        }
        
        currentIndex = minCostIndex;
        
        /* å¤æ­æ¯å¦å°è¾¾ç»ç¹ */
        if (currentIndex == endIndex)
        {
            /* åæº¯è·¯å¾ */
            tempLen = 0;
            father = astar->nodes[currentIndex].father;
            tempPath[tempLen] = currentIndex;
            tempLen = tempLen + 1;
            
            while (father != -1)
            {
                tempPath[tempLen] = father;
                tempLen = tempLen + 1;
                currentIndex = father;
                father = astar->nodes[currentIndex].father;
            }
            
            /* åè½¬è·¯å¾ */
            for (i = 0; i < tempLen; i++)
            {
                path[i] = tempPath[tempLen - 1 - i];
            }
            *pathLen = tempLen;
            return 0;
        }
        
        /* ç§»åºOpenListï¼å å¥ClosedList */
        astar->nodes[currentIndex].isInList = 2;
        
        /* éåé»å± */
        for (i = 0; i < astar->nodes[currentIndex].neighborNum; i++)
        {
            neighborIndex = astar->nodes[currentIndex].neighbors[i];
            
            if (2 == astar->nodes[neighborIndex].isInList)
            {
                continue; /* å¨ClosedListä¸­ */
            }
            
            gCost = astar->nodes[currentIndex].gCost + astar->nodes[neighborIndex].length;
            hCost = calcHeuristic(&astar->nodes[neighborIndex], &astar->nodes[endIndex]);
            
            if (1 == astar->nodes[neighborIndex].isInList)
            {
                /* å¨OpenListä¸­ï¼æ£æ¥æ¯å¦æ´ä¼ */
                if (gCost < astar->nodes[neighborIndex].gCost)
                {
                    astar->nodes[neighborIndex].gCost = gCost;
                    astar->nodes[neighborIndex].father = currentIndex;
                }
            }
            else
            {
                /* ä¸å¨OpenListä¸­ï¼å å¥ */
                astar->nodes[neighborIndex].isInList = 1;
                astar->nodes[neighborIndex].gCost = gCost;
                astar->nodes[neighborIndex].hCost = hCost;
                astar->nodes[neighborIndex].father = currentIndex;
            }
        }
    }
    
    return -1;
}

/**
 * @brief æå°è§åç»æ
 * @details è¾åºè·¯å¾åå«çéè·¯ID
 * @param[in] path è·¯å¾ç´¢å¼æ°ç»
 * @param[in] pathLen è·¯å¾é¿åº¦
 * @param[in] astar A*ç®æ³ä¸ä¸æ
 * @retval void
 * @author system
 * @date 2023-10-27
 */
void printPathResult(const int* path, const int pathLen, const AstarContext* astar)
{
    int i = 0;
    printf("Routing Path: ");
    for (i = 0; i < pathLen; i++)
    {
        printf("%d ", astar->nodes[path[i]].id);
    }
    printf("\n");
}

/**
 * @brief ææå°å¾è·¯å¾è§åä¸»å¥å£
 * @brief Topology Map Path Planning
 * @details æ´åå°å¾è§£æä¸A*ç®æ³æµç¨
 * @param[in] param è¾å¥åæ°
 * @param[in] input è¾å¥æ°æ®
 * @param[out] output è¾åºç»æ
 * @retval void
 * @author system
 * @date 2023-10-27
 */
void runTopologyMapPlanning(const TopoPlanningParam* param, const TopoPlanningInput* input, TopoPlanningOutput* output)
{
    int ret = 0;
    TopologyMap map;
    AstarContext astar;
    int path[128] = {0};
    int pathLen = 0;
    
    (void)param; /* æ¶é¤æªä½¿ç¨è­¦å */
    
    /* 1. è§£æå°å¾ */
    ret = parseTopologyMap(input->mapPath, &map);
    if (0 != ret)
    {
        output->result = -1;
        return;
    }
    
    /* 2. åå§åA*è·¯ç½ */
    initAstarNodes(&map, &astar);
    initAstarLinks(&map, &astar);
    
    /* 3. æ§è¡è·¯å¾æç´¢ */
    ret = findPathAstar(input->startRoadId, input->endRoadId, &astar, path, &pathLen);
    
    if (0 == ret)
    {
        output->result = 0;
        output->pathLen = pathLen;
        /* å¤å¶è·¯å¾ */
        if (pathLen > 0)
        {
            memcpy(output->pathNodes, path, sizeof(int) * (size_t)pathLen);
        }
        
        printPathResult(path, pathLen, &astar);
    }
    else
    {
        output->result = -1;
        printf("Path finding failed.\n");
    }
    
    /* 4. éæ¾èµæº */
    if (NULL != map.roads)
    {
        int i = 0;
        for (i = 0; i < map.roadNum; i++)
        {
            if (NULL != map.roads[i].lanes)
            {
                free(map.roads[i].lanes);
            }
        }
        free(map.roads);
    }
    
    if (NULL != astar.nodes)
    {
        free(astar.nodes);
    }
}