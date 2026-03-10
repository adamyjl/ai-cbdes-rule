/**
 * @file funTriangle.cpp
 * @brief 三角形计算模块实现文件
 * @details 实现基于底高、三边长度、坐标点的三角形面积计算逻辑
 */

#include "funTriangle.h"
#include <cmath>

/**
 * @brief 判断浮点数是否为NaN
 * @en_name checkIsNan
 * @cn_name 判断是否无效
 * @type Function
 * @param value[IN] 待判断的数值
 * @retval int 1表示是NaN，0表示不是NaN
 * @granularity 三级函数
 * @tag_level1 辅助工具
 * @version 1.0
 * @date 2023-10-27
 * @author SystemGenerator
 */
static int checkIsNan(double value) {
    int ret = 0;
    /* 标准库NaN特性判断：x != x 结果为真 */
    if (value != value) {
        ret = 1;
    }
    return ret;
}

/**
 * @brief 基于底和高计算三角形面积
 * @en_name calcAreaBaseHeight
 * @cn_name 底高计算面积
 * @type Function
 * @param base[IN] 三角形底边长度
 * @param height[IN] 三角形的高
 * @retval double 面积计算结果
 * @granularity 三级函数
 * @tag_level1 几何计算
 * @formula S = 0.5 * base * height
 * @version 1.0
 * @date 2023-10-27
 * @author SystemGenerator
 */
static double calcAreaBaseHeight(double base, double height) {
    double area = 0.0;
    area = 0.5 * base * height;
    return area;
}

/**
 * @brief 基于三边长度计算三角形面积（海伦公式）
 * @en_name calcAreaThreeSides
 * @cn_name 三边计算面积
 * @type Function
 * @param a[IN] 边长a
 * @param b[IN] 边长b
 * @param c[IN] 边长c
 * @retval double 面积计算结果，若无法构成三角形则返回NaN
 * @granularity 三级函数
 * @tag_level1 几何计算
 * @formula S = sqrt(p * (p-a) * (p-b) * (p-c)), p = (a+b+c)/2
 * @version 1.0
 * @date 2023-10-27
 * @author SystemGenerator
 */
static double calcAreaThreeSides(double a, double b, double c) {
    double area = 0.0;
    double p = 0.0;
    double areaSquared = 0.0;
    int isValid = 1; /* 1表示有效，0表示无效 */
    
    /* 边长必须为正数 */
    if (a <= 0.0 || b <= 0.0 || c <= 0.0) {
        isValid = 0;
    }
    
    /* 三角形两边之和大于第三边 */
    if (isValid == 1) {
        if ((a + b > c) && (a + c > b) && (b + c > a)) {
            isValid = 1;
        } else {
            isValid = 0;
        }
    }

    if (isValid == 1) {
        p = (a + b + c) * 0.5;
        areaSquared = p * (p - a) * (p - b) * (p - c);
        /* 防止浮点误差导致负数 */
        if (areaSquared < 0.0) {
            areaSquared = 0.0;
        }
        area = sqrt(areaSquared);
    } else {
        /* 强制生成NaN */
        area = sqrt(-1.0);
    }

    return area;
}

/**
 * @brief 基于坐标点计算三角形面积（鞋带公式）
 * @en_name calcAreaCoordinates
 * @cn_name 坐标计算面积
 * @type Function
 * @param x0[IN] 点1的x坐标
 * @param y0[IN] 点1的y坐标
 * @param x1[IN] 点2的x坐标
 * @param y1[IN] 点2的y坐标
 * @param x2[IN] 点3的x坐标
 * @param y2[IN] 点3的y坐标
 * @retval double 面积计算结果，若三点共线则返回NaN
 * @granularity 三级函数
 * @tag_level1 几何计算
 * @formula S = 0.5 * |x0(y1 - y2) + x1(y2 - y0) + x2(y0 - y1)|
 * @version 1.0
 * @date 2023-10-27
 * @author SystemGenerator
 */
static double calcAreaCoordinates(double x0, double y0, double x1, double y1, double x2, double y2) {
    double area = 0.0;
    double det = 0.0;
    int isValid = 1;

    /* 计算向量叉积（行列式）判断是否共线 */
    det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    
    /* 如果叉积绝对值极小，视为共线，构不成三角形 */
    if (fabs(det) < 1e-10) {
        isValid = 0;
    }

    if (isValid == 1) {
        /* 使用鞋带公式计算面积 */
        double term1 = 0.0;
        double term2 = 0.0;
        double term3 = 0.0;

        term1 = x0 * (y1 - y2);
        term2 = x1 * (y2 - y0);
        term3 = x2 * (y0 - y1);
        area = 0.5 * fabs(term1 + term2 + term3);
    } else {
        area = sqrt(-1.0);
    }

    return area;
}

/**
 * @brief 路由函数：根据模式计算三角形面积
 * @en_name calculateTriangleArea
 * @cn_name 计算三角形面积
 * @type Function
 * @param mode[IN] 计算模式：0-底和高，1-三边长度，2-坐标点
 * @param params[IN] 输入参数数组
 * @retval double 面积
 * @granularity 二级函数
 * @version 1.0
 * @date 2023-10-27
 * @author SystemGenerator
 */
double calculateTriangleArea(int mode, const double params[]) {
    double result = 0.0;
    int validMode = 1;

    if (mode == 0) {
        /* 模式0：底和高 {base, height} */
        double base = 0.0;
        double height = 0.0;
        base = params[0];
        height = params[1];
        result = calcAreaBaseHeight(base, height);
    } else if (mode == 1) {
        /* 模式1：三边长度 {a, b, c} */
        double a = 0.0;
        double b = 0.0;
        double c = 0.0;
        a = params[0];
        b = params[1];
        c = params[2];
        result = calcAreaThreeSides(a, b, c);
    } else if (mode == 2) {
        /* 模式2：坐标点 {x0, y0, x1, y1, x2, y2} */
        double x0 = 0.0;
        double y0 = 0.0;
        double x1 = 0.0;
        double y1 = 0.0;
        double x2 = 0.0;
        double y2 = 0.0;
        x0 = params[0];
        y0 = params[1];
        x1 = params[2];
        y1 = params[3];
        x2 = params[4];
        y2 = params[5];
        result = calcAreaCoordinates(x0, y0, x1, y1, x2, y2);
    } else {
        /* 未知模式，返回NaN */
        result = sqrt(-1.0);
    }

    return result;
}