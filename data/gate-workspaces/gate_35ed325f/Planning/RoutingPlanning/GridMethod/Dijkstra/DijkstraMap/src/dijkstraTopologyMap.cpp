#include "../../include/dijkstraTopologyMap.h"
#include <cmath>
#include <iostream>
#include <algorithm>
#include <list>
#include <utility>


/**
 * @brief å°å°å¾æ°æ®è½¬æ¢ä¸ºA*ç®æ³æéçå¾ç»æ
 * @en_name Convert Map to Astar Graph
 * @cn_name å°å¾è½¬Aæå¾
 * @type Function
 * @param[in] m å°å¾æ°æ®ç»æ
 * @param[out] as A*ç®æ³å¯¹è±¡æé
 * @var æ 
 * @retval void
 * @granularity Secondary
 * @tag_level1 è·¯å¾è§å
 * @tag_level2 Aæç®æ³
 * @formula æ 
 * @version 1.0
 * @date 2023-10-27
 * @author SystemArchitect
 */
void mapToAstar(Map m, Astar* as)
{
    int roadCount = 0;
    roadCount = m.roads.size();
    
    int loopIndex = 0;
    for (loopIndex = 0; loopIndex < roadCount; loopIndex++)
    {
        Road currentRoad = m.roads[loopIndex];
        int number = currentRoad.id;
        
        double xStart = 0.0;
        double yStart = 0.0;
        double xEnd = 0.0;
        double yEnd = 0.0;
        
        int laneCount = currentRoad.lanes.size();
        if (laneCount > 0)
        {
            Lane firstLane = currentRoad.lanes[0];
            int pointCount = firstLane.gaussRoadPoints.size();
            if (pointCount > 0)
            {
                GaussRoadPoint startPoint = firstLane.gaussRoadPoints[0];
                xStart = startPoint.GaussX;
                yStart = startPoint.GaussY;
                
                GaussRoadPoint endPoint = firstLane.gaussRoadPoints[pointCount - 1];
                xEnd = endPoint.GaussX;
                yEnd = endPoint.GaussY;
            }
        }
        
        double deltaX = 0.0;
        double deltaY = 0.0;
        double length = 0.0;
        
        deltaX = xStart - xEnd;
        deltaY = yStart - yEnd;
        length = sqrt(deltaX * deltaX + deltaY * deltaY);
        
        (*as).initRoad(number, xStart, yStart, xEnd, yEnd, length);
        
        int sucCount = currentRoad.successorId.size();
        int sucIndex = 0;
        for (sucIndex = 0; sucIndex < sucCount; sucIndex++)
        {
            int successorId = currentRoad.successorId[sucIndex];
            (*as).initLink(number, successorId);
        }
    }
}

/**
 * @brief ä½¿ç¨A*ç®æ³è·åä¸¤ç¹é´çè·¯å¾
 * @en_name Get Path using Astar
 * @cn_name Aæå¯»è·¯
 * @type Function
 * @param[in] origin èµ·ç¹ID
 * @param[in] destination ç»ç¹ID
 * @param[out] path è·¯å¾èç¹åè¡¨
 * @var æ 
 * @retval void
 * @granularity Secondary
 * @tag_level1 è·¯å¾è§å
 * @tag_level2 Aæç®æ³
 * @formula æ 
 * @version 1.0
 * @date 2023-10-27
 * @author SystemArchitect
 */
void getPath(int origin, int destination, std::list<int>& path)
{
    path.clear();
    
    int startStatus = 0;
    startStatus = roadList[origin].isInList;
    
    int endStatus = 0;
    endStatus = roadList[destination].isInList;
    
    if (startStatus == -2)
    {
        std::cout << "getPath wrong : åºåç¹çè¾¹æªè¢«åå§å";
        return;
    }
    
    if (endStatus == -2)
    {
        std::cout << "getPath wrong : ç®çå°çè¾¹æªè¢«åå§å";
        return;
    }
    
    std::cout << "ä½¿ç¨A*ç®æ³å¯»æ¾ä» " << origin << " å° " << destination << "çæç­è·¯" << std::endl;
    std::cout << "å·²ç»åå§åçè¾¹æ: ";
    
    int i = 0;
    for (i = 0; i < size; i++)
    {
        int currentStatus = roadList[i].isInList;
        if (currentStatus == 0)
        {
            std::cout << i << " ";
        }
    }
    std::cout << std::endl;

    if (origin == destination)
    {
        path.push_back(destination);
        return;
    }

    road* result = findPath(origin, destination);
    int temp = result->father;
    
    path.push_back(destination);
    path.push_front(temp);
    
    int loopCond = 0;
    loopCond = (temp != origin);
    while (loopCond)
    {
        temp = roadList[temp].father;
        path.push_front(temp);
        loopCond = (temp != origin);
    }
    
    if (!openList.empty())
    {
        openList.pop();
    }
}

/**
 * @brief å¨è·¯ç½è·¯å¾ä¸­æ¥æ¾å·ä½çè½¦éè¿æ¥
 * @en_name Find Lane Connection in Path
 * @cn_name è·¯å¾è½¦éæ¥æ¾
 * @type Function
 * @param[in] m å°å¾æ°æ®ç»æ
 * @param[in] path è·¯å¾èç¹åè¡¨
 * @param[out] pathLanes è·¯å¾å¯¹åºçè½¦éåè¡¨
 * @var æ 
 * @retval void
 * @granularity Secondary
 * @tag_level1 è·¯å¾è§å
 * @tag_level2 è½¦éçº§è§å
 * @formula æ 
 * @version 1.0
 * @date 2023-10-27
 * @author SystemArchitect
 */
void findLane(Map m, std::list<int> path, std::vector<std::pair<int, int>>& pathLanes)
{
    pathLanes.clear();
    
    std::list<int>::iterator it = path.begin();
    std::list<int>::iterator itNext = path.begin();
    
    if (it == path.end()) return;
    
    itNext++;
    
    int loopCond = 0;
    loopCond = (itNext != path.end());
    
    while (loopCond)
    {
        int currentRoadId = *it;
        int nextRoadId = *itNext;
        
        bool found = false;
        
        int roadIndex = 0;
        int roadCount = m.roads.size();
        
        for (roadIndex = 0; roadIndex < roadCount; roadIndex++)
        {
            Road road = m.roads[roadIndex];
            if (road.id == currentRoadId)
            {
                int laneIndex = 0;
                int laneCount = road.lanes.size();
                
                for (laneIndex = 0; laneIndex < laneCount; laneIndex++)
                {
                    Lane lane = road.lanes[laneIndex];
                    
                    int sucIndex = 0;
                    int sucCount = lane.successorId.size();
                    
                    for (sucIndex = 0; sucIndex < sucCount; sucIndex++)
                    {
                        LaneSuccessorId suc = lane.successorId[sucIndex];
                        
                        if (suc.sucRoadID == nextRoadId)
                        {
                            int currentLaneId = lane.id;
                            int targetLaneId = suc.sucLaneID;
                            
                            bool isSameLane = false;
                            if (!pathLanes.empty())
                            {
                                std::pair<int, int> lastPair = pathLanes.back();
                                isSameLane = (currentLaneId == lastPair.second);
                            }
                            
                            if (!isSameLane)
                            {
                                std::pair<int, int> currentPair;
                                currentPair.first = currentRoadId;
                                currentPair.second = currentLaneId;
                                pathLanes.push_back(currentPair);
                            }
                            
                            std::pair<int, int> nextPair;
                            nextPair.first = nextRoadId;
                            nextPair.second = targetLaneId;
                            pathLanes.push_back(nextPair);
                            
                            found = true;
                            break;
                        }
                    }
                    
                    if (found)
                    {
                        break;
                    }
                }
                
                if (found)
                {
                    break;
                }
            }
        }
        
        it++;
        itNext++;
        loopCond = (itNext != path.end());
    }
}