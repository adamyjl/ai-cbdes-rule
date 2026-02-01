/**
 * @brief GPS头文件
 * @file gpsFunctional.h
 * @version 0.0.1
 * @author Zihan Xie (770178863@qq.com)
 * @date 2023-11-27
 */
#include<iostream>
#include<QApplication>
#include "configure.h"
#include "mainwindow.h"
#include "GGA.h"
#include "GPFPD.h"
#include "GPYBM.h"
using namespace std;

struct paraAPP{};

struct inputAPP{
    int argc;
    char **argv;
};


struct outputAPP{};

struct paraGGA{};

struct inputGGA{string data;};

struct outputGGA{NMEAGGA data;};

struct paraGPYBM{};

struct inputGPYBM{string data;};

struct outputGPYBM{NMEAGPYBM data;};

struct paraGPFPD{};

struct inputGPFPD{string data;};

struct outputGPFPD{NMEAGPFPD data;};

struct calcCheckPara{};

struct calcCheckInput{string data;};

struct calcCheckOutput{long check;};

struct dmm2degPara{};

struct dmm2degInput{double dmm;};

struct dmm2degOutput{double data;};
/**
 * @brief 打开GPS窗口
 * @param[IN] paraAPP 空、占位
 * @param[IN] inputAPP main输入参数
 * @param[IN] outputAPP 空、占位
 * @cn_name: 打开GPS窗口
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag localization
 */
int openQTWindow(int argc,char **argv);

/**
 * @brief 解析GGA数据
 * @param[IN] paraGGA 空、占位
 * @param[IN] inputGGA 输入字符串
 * @param[IN] outputGGA NMEAGGA对象
 * @cn_name: 解析GGA数据
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag localization
 */
void getGGA(const paraGGA &para,const inputGGA &input,outputGGA &output);
/**
 * @brief 解析GPFPD数据
 * @param[IN] paraGPFPD 空、占位
 * @param[IN] inputGPFPD 输入字符串
 * @param[IN] outputGPFPD NMEAGPFPD对象
 * @cn_name: 解析GPFPD数据
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag localization
 */
void getGPFPD(const paraGPFPD &para,const inputGPFPD &input,outputGPFPD &output);
/**
 * @brief 解析GPYBM数据
 * @param[IN] paraGPYBM 空、占位
 * @param[IN] inputGPYBM 输入字符串
 * @param[IN] outputGPYBM NMEAGPYBM对象
 * @cn_name: 解析GPYBM数据
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag localization
 */
void getGPYBM(const paraGPYBM &para,const inputGPYBM &input,outputGPYBM &output);


/**
 * @brief 计算NEMA数据校验位
 * @param[IN] calcCheckPara 空、占位
 * @param[IN] calcCheckInput 计算校验位字符串
 * @param[IN] calcCheckOutput 校验位对应的16进制数
 * @cn_name: 计算NEMA数据校验位
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag localization
 */
void calcCheckSum(calcCheckPara &para,calcCheckInput &input,calcCheckOutput &output);
/**
 * @brief 将NMEA中 ddmm.mm 格式转换为小数度
 * @param[IN] dmm2degPara 空、占位
 * @param[IN] dmm2degInput ddmm.mm格式经纬度
 * @param[IN] dmm2degOutput 小数度格式的经纬度
 * @cn_name: 将NMEA中 ddmm.mm 格式转换为小数度
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag localization
 */
void dmm2deg(dmm2degPara &para,dmm2degInput &input,dmm2degOutput &output);
