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

#include <math.h>

/* 定义坐标点结构体 */
typedef struct {
    double x; /* 坐标X */
    double y; /* 坐标Y */
    double z; /* 坐标Z */
} Point3D;

/* 定义地图道路信息结构体 */
typedef struct {
    int id;         /* 道路ID */
    double length;  /* 道路长度 (m) */
    Point3D start;  /* 起始点坐标 */
    Point3D end;    /* 终止点坐标 */
} RoadInfo;

/* 定义地图结构体 */
typedef struct {
    RoadInfo* roads; /* 道路数组指针 */
    int roadCount;   /* 道路总数 */
} Map;

#ifdef __cplusplus
}
#endif

#endif /* DATA_TYPE_H */