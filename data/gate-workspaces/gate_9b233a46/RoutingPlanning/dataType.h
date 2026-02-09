/**
  **************************************************************************************
  * @file    dataType.h
  * @author  System Generator
  * @date    2023-10-27
  * @brief   通用数据类型定义
  **************************************************************************************
  */

#ifndef DATA_TYPE_H
#define DATA_TYPE_H

#ifdef __cplusplus
extern "C" {
#endif

/* @brief 道路ID类型 */
typedef int RoadId;

/* @brief 车道ID类型 */
typedef int LaneId;

/* @brief 坐标点结构体 */
typedef struct {
    double x; /* X坐标 (m) */
    double y; /* Y坐标 (m) */
} Point2D;

/* @brief 车道结构体 */
typedef struct {
    LaneId id; /* 车道ID */
    double length; /* 车道长度 (m) */
    Point2D startPoint; /* 起点坐标 (m) */
    Point2D endPoint; /* 终点坐标 (m) */
} Lane;

/* @brief 道路结构体 */
typedef struct {
    RoadId id; /* 道路ID */
    Lane* lanes; /* 车道数组指针 */
    int laneCount; /* 车道数量 */
} Road;

/* @brief 地图结构体 */
typedef struct {
    Road* roads; /* 道路数组指针 */
    int roadCount; /* 道路数量 */
} Map;

#ifdef __cplusplus
}
#endif

#endif /* DATA_TYPE_H */