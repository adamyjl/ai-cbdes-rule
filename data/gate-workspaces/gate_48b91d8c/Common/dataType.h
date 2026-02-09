/**
  ******************************************************************************
  * @file    dataType.h
  * @author  System Generator
  * @date    2023-10-27
  * @brief   公共数据类型定义
  ******************************************************************************
  */

#ifndef DATA_TYPE_H
#define DATA_TYPE_H

#ifdef __cplusplus
extern "C" {
#endif

#define MAX_ROADS 100
#define MAX_LANES_PER_ROAD 10
#define MAX_PATH_NODES 50
#define MAX_ID_LEN 32

/**
  * @brief 车道信息结构体
  */
typedef struct {
    int id;                     ///< 车道ID
    int leftLaneId;             ///< 左侧车道ID
    int rightLaneId;            ///< 右侧车道ID
    double length;              ///< 车道长度 (m)
} LaneInfo;

/**
  * @brief 道路信息结构体
  */
typedef struct {
    int id;                     ///< 道路ID
    double xBegin;              ///< 起点X坐标 (m)
    double yBegin;              ///< 起点Y坐标 (m)
    double xEnd;                ///< 终点X坐标 (m)
    double yEnd;                ///< 终点Y坐标 (m)
    double length;              ///< 道路长度 (m)
    int laneCount;              ///< 车道数量
    LaneInfo lanes[MAX_LANES_PER_ROAD]; ///< 车道列表
    int to[MAX_ROADS];          ///< 连接的后继道路ID列表
    int toCount;                ///< 后继道路数量
} RoadInfo;

/**
  * @brief 地图结构体
  */
typedef struct {
    RoadInfo roads[MAX_ROADS];  ///< 道路列表
    int roadCount;              ///< 道路总数
} Map;

/**
  * @brief 路径输出结构体
  */
typedef struct {
    int pathNodes[MAX_PATH_NODES]; ///< 路径节点ID列表
    int pathSize;                  ///< 路径节点数量
    int pathLanes[MAX_PATH_NODES]; ///< 路径对应车道列表
} PathInfo;

#ifdef __cplusplus
}
#endif

#endif /* DATA_TYPE_H */