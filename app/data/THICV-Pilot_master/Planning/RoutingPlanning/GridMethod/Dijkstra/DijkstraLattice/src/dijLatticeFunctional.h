/**
 * @brief DijkstraLattice功能头文件
 * @file dijLatticeFunctional.h
 * @version 0.0.1
 * @author Zihan Xie (770178863@qq.com)
 * @date 2023-12-19
 */
#include <iostream>
#include "opencv2/highgui/highgui.hpp"
#include <opencv2/opencv.hpp>
#include "dijkstra_latticeMap.h"
#include <opencv2/core/core.hpp> 
#include <opencv2/imgproc/types_c.h>
using namespace cv;
using namespace std;
using namespace std;

struct rmPara{};

struct rmInput{string filename;};

struct rmOutput{
    vector<vector<int>> map;
    vector<vector<int>> hvalue;};

struct  dijPara{};

struct dijInput
{
    Point1 start;
    Point1 end;
    vector<vector<int>> map;
    vector<vector<int>> hvalue;
};

struct dijOutput
{
    list<Point1 *> path;
};

struct sePara{};

struct seInput
{
    Mat img;
};

struct seOutput
{
    Point1 start;
    Point1 end;
};

struct pmPara{};

struct pmInput
{
    Mat *img;
    Point1 *start;
    Point1 *end;
    list<Point1 *> *path;
    pmInput()
    {
        img = nullptr;
        start = nullptr;
        end = nullptr;
        path = nullptr;
    }
};

struct pmOutput{Mat img;};

struct InitDijPara{};

struct InitDijInput
{
    vector<std::vector<int>> maze;
    vector<std::vector<int>> hvalue;
};

struct InitDijOutput{Astar A;};

//void InitAstar(const std::vector<std::vector<int>>& _maze, const std::vector<std::vector<int>>& _hvalue);

void on_mouse(int event, int x, int y, int flags, void* ustc);
/**
 * @brief Dijkstra读取地图图片
 * @param[IN] rmPara 无效占位
 * @param[IN] rmInput 文件路径
 * @param[IN] rmOutput 地图数组、halue数组
 * @cn_name: Dijkstra读取地图图片
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: planning
 */
void DijkstraReadMap(const rmPara &para,const rmInput &input,rmOutput &output);
/**
 * @brief Dijkstra在地图上获取起始点和终点
 * @param[IN] sePara 无效占位
 * @param[IN] seInput Mat对象
 * @param[IN] seOutput 起点和终点
 * @cn_name: Dijkstra在地图上获取起始点和终点
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: planning
 */
void DijkstraGetStartEnd(const sePara &para,const seInput &input,seOutput &output);
/**
 * @brief Dijkstra求最短路径
 * @param[IN] dijPara 无效占位
 * @param[IN] dijInput 起点、终点、地图数组、hvalue数组
 * @param[IN] dijOutput 路径列表
 * @cn_name: Dijkstra求最短路径
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: planning
 */
void DijkstraGetPathDijMap(const dijPara &para,const dijInput &input,dijOutput &output);
/**
 * @brief Dijkstra打印地图图片
 * @param[IN] pmPara 无效占位
 * @param[IN] pmInput Map对象指针、起点指针、终点指针、路径列表指针
 * @param[IN] pmOutput Map对象
 * @cn_name: Dijkstra打印地图图片
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: planning
 */
void DijkstraPrintMap(const pmPara &para,const pmInput &input,pmOutput &output);
/**
 * @brief 初始化Dijkstra
 * @param[IN] InitDijPara 无效占位
 * @param[IN] InitDijInput 地图数组、hvalue数组
 * @param[IN] InitDijOutput Astar对象
 * @cn_name: 初始化Dijkstra
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: planning
 */
void DijkstraInitDij(InitDijPara &para,InitDijInput &input,InitDijOutput &output);
