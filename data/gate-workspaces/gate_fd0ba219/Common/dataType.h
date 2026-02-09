/**
  **************************************************************************************
  * @file    dataType.h
  * @author  System Generator
  * @date    2023-10-27
  * @brief   全局数据类型定义
  **************************************************************************************
  */

#ifndef DATA_TYPE_H
#define DATA_TYPE_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>

/**
  * @brief 最大字符串长度
  */
#define MAX_STRING_LEN 256

/**
  * @brief 最大道路数
  */
#define MAX_ROADS 100

/**
  * @brief 单条道路最大车道数
  */
#define MAX_LANES_PER_ROAD 10

/**
  * @brief 最大车道连接数
  */
#define MAX_LANE_LINKS 10

/**
  * @brief 最大路径节点数
  */
#define MAX_PATH_NODES 100

/**
  * @brief 车道结构体
  */
typedef struct {
    int32_t id;                       /**< 车道ID */
    double length;                    /**< 车道长度 (m) */
} Lane;

/**
  * @brief 道路结构体
  */
typedef struct {
    int32_t id;                       /**< 道路ID */
    int32_t laneCount;                /**< 车道数量 */
    Lane lanes[MAX_LANES_PER_ROAD];   /**< 车道列表 */
} Road;

/**
  * @brief 地图结构体
  */
typedef struct {
    int32_t roadCount;                /**< 道路数量 */
    Road roads[MAX_ROADS];            /**< 道路列表 */
} Map;

/**
  * @brief 地图分析输入参数
  */
typedef struct {
    char filePath[MAX_STRING_LEN];    /**< 地图文件路径 */
} MapAnalysisInput;

/**
  * @brief 地图分析输出参数
  */
typedef struct {
    Map targetMap;                    /**< 解析后的地图数据 */
} MapAnalysisOutput;

/**
  * @brief 地图分析控制参数
  */
typedef struct {
    int32_t dummy;                    /**< 保留参数 */
} MapAnalysisParam;

/**
  * @brief 路径查找输入参数
  */
typedef struct {
    Map map;                          /**< 地图数据 */
    int32_t originId;                 /**< 起点ID */
    int32_t destinationId;            /**< 终点ID */
} PathFinderInput;

/**
  * @brief 路径查找输出参数
  */
typedef struct {
    int32_t pathNodes[MAX_PATH_NODES];/**< 路径节点ID列表 */
    int32_t pathSize;                 /**< 路径节点数量 */
} PathFinderOutput;

/**
  * @brief 路径查找控制参数
  */
typedef struct {
    int32_t dummy;                    /**< 保留参数 */
} PathFinderParam;

#ifdef __cplusplus
}
#endif

#endif /* DATA_TYPE_H */