/**
 * @brief 文件说明 
 * @file funcClassicLaneDetect.hpp
 * @version 0.0.1
 * @author Chi Ding (dc22@mails.tsinghua.edu.com)
 * @date 2023-12-28
 */

#include <opencv2/opencv.hpp>
#include <opencv2/highgui.hpp>
#include <vector>
#include "ClassicLaneDetect.hpp"

typedef struct{

}ParamStruct01;

typedef struct{
    ClassicLaneDetect laneDetect;
}InputStruct01;

typedef struct{

}OutputStruct01;

/**
* @brief classicLaneDetectRun函数
* @param[IN] param1, 空参数
* @param[IN] input1, classicLaneDetect类的对象
* @param[OUT] output1, 空输出
* @cn_name 运行车道线检测
* @granularity atomic 
* @tag perception
*/
void classicLaneDetectRun (ParamStruct01 &,InputStruct01 &,OutputStruct01 &);



typedef struct{
    vector<Point> chain;
    int n;
    Mat a;
}ParamStruct02;

typedef struct{
    ClassicLaneDetect laneDetect;
}InputStruct02;

typedef struct{

}OutputStruct02;

/**
* @brief classicLaneDetectPolyFit函数
* @param[IN] param2, 自变量数据，多项式次数，因变量数据
* @param[IN] input2, classicLaneDetect类的对象
* @param[OUT] output2, 空输出
* @cn_name 点云拟合
* @granularity atomic 
* @tag perception
*/
void classicLaneDetectPolyFit (ParamStruct02 &,InputStruct02 &,OutputStruct02 &);



typedef struct{
    Mat originImage;
}ParamStruct03;


typedef struct{
    ClassicLaneDetect laneDetect;
}InputStruct03;

typedef struct{

}OutputStruct03;

/**
* @brief classicLaneDetectGetPerspectiveMatrix函数
* @param[IN] param3, 原始图片
* @param[IN] input3, classicLaneDetect类的对象
* @param[OUT] output3, 空输出
* @cn_name 映射透视矩阵
* @granularity atomic 
* @tag perception
*/
void classicLaneDetectGetPerspectiveMatrix (ParamStruct03 &,InputStruct03 &,OutputStruct03 &);



typedef struct{
    Mat originImage;
}ParamStruct04;

typedef struct{
    ClassicLaneDetect laneDetect;
}InputStruct04;

typedef struct{
     Mat compensateImage;
}OutputStruct04;

/**
* @brief classicLaneDetectLightCompensate函数
* @param[IN] param4, 原始图片
* @param[IN] input4, classicLaneDetect类的对象
* @param[OUT] output4, 补偿后图片
* @cn_name 光补偿
* @granularity atomic 
* @tag perception
*/
void classicLaneDetectLightCompensate (ParamStruct04 &,InputStruct04 &,OutputStruct04 &);



typedef struct{
    Mat originImage;
}ParamStruct05;

typedef struct{
    ClassicLaneDetect laneDetect;
}InputStruct05;

typedef struct{
     Mat enhancedImage;
}OutputStruct05;

/**
* @brief classicLaneDetectImageEnhancement函数
* @param[IN] param5, 原始图片
* @param[IN] input5, classicLaneDetect类的对象
* @param[OUT] output5, 增强后图片
* @cn_name 图片增强
* @granularity atomic 
* @tag perception
*/
void classicLaneDetectImageEnhancement (ParamStruct05 &,InputStruct05 &,OutputStruct05 &);




typedef struct{
    Mat originImage;
}ParamStruct06;


typedef struct{
    ClassicLaneDetect laneDetect;
}InputStruct06;


typedef struct{
     Mat processImage;
}OutputStruct06;

/**
* @brief classicLaneDetectPreProcess函数
* @param[IN] param6, 原始图片
* @param[IN] input6, classicLaneDetect类的对象
* @param[OUT] output6, 预处理后图片
* @cn_name 图片预处理
* @granularity atomic 
* @tag perception
*/
void classicLaneDetectPreProcess (ParamStruct06 &,InputStruct06 &,OutputStruct06 &);




typedef struct{
    Mat image;
    vector<Point> leftPoints1;
    vector<Point> leftPoints2;
    vector<Point> rightPoints1;
    vector<Point> rightPoints2;
}ParamStruct07;


typedef struct{
    ClassicLaneDetect laneDetect;
}InputStruct07;


typedef struct{

}OutputStruct07;

/**
* @brief classicLaneDetectDetectLaneByEdges函数
* @param[IN] param7, 原始图片,左车道线左边界点，左车道线右边界点，右车道线左边界点，右车道线右边界点
* @param[IN] input7, classicLaneDetect类的对象
* @param[OUT] output7, 空输出
* @cn_name 依据边界的车道线检测
* @granularity atomic 
* @tag perception
*/
void classicLaneDetectDetectLaneByEdges (ParamStruct07 &,InputStruct07 &,OutputStruct07 &);




typedef struct{
    vector<Point> leftPoints1;
    vector<Point> leftPoints2;
    vector<Point> rightPoints1;
    vector<Point> rightPoints2;
}ParamStruct08;


typedef struct{
    ClassicLaneDetect laneDetect;
}InputStruct08;


typedef struct{
    Mat leftFunc;
    Mat rightFunc;
}OutputStruct08;

/**
* @brief classicLaneDetectGenerateFinalLanes函数
* @param[IN] param8, 左车道线左边界点，左车道线右边界点，右车道线左边界点，右车道线右边界点
* @param[IN] input8, classicLaneDetect类的对象
* @param[OUT] output8, 左车道线绘制参数，右车道线绘制参数
* @cn_name 最终左右车道线参数
* @granularity atomic 
* @tag perception
*/
void classicLaneDetectGenerateFinalLanes (ParamStruct08 &,InputStruct08 &,OutputStruct08 &);




typedef struct{
    Mat showImage;
    Mat laneFunc;
}ParamStruct09;


typedef struct{
    ClassicLaneDetect laneDetect;
}InputStruct09;


typedef struct{
   
}OutputStruct09;

/**
* @brief classicLaneDetectDrawLane函数
* @param[IN] param9, 原始图片，车道线绘制参数
* @param[IN] input9, classicLaneDetect类的对象
* @param[OUT] output9, 空输出
* @cn_name 绘制车道线
* @granularity atomic 
* @tag perception
*/
void classicLaneDetectDrawLane (ParamStruct09 &,InputStruct09 &,OutputStruct09 &);




typedef struct{
  
}ParamStruct10;


typedef struct{
    ClassicLaneDetect laneDetect;
}InputStruct10;


typedef struct{
   
}OutputStruct10;

/**
* @brief classicLaneDetectDisplayLanes函数
* @param[IN] param10, 空参数
* @param[IN] input10, classicLaneDetect类的对象
* @param[OUT] output10, 空输出
* @cn_name 呈现车道线
* @granularity atomic 
* @tag perception
*/
void classicLaneDetectDisplayLanes (ParamStruct10 &,InputStruct10 &,OutputStruct10 &);




typedef struct{
  
}ParamStruct11;


typedef struct{
    ClassicLaneDetect laneDetect;
}InputStruct11;


typedef struct{
   
}OutputStruct11;

/**
* @brief classicLaneDetectModuleSelfCheck函数
* @param[IN] param11, 空参数
* @param[IN] input11, classicLaneDetect类的对象
* @param[OUT] output11, 空输出
* @cn_name 车道线参数确认
* @granularity atomic 
* @tag perception
*/
void classicLaneDetectModuleSelfCheck (ParamStruct11 &,InputStruct11 &,OutputStruct11 &);




typedef struct{
  
}ParamStruct12;


typedef struct{
    ClassicLaneDetect laneDetect;
}InputStruct12;


typedef struct{
   
}OutputStruct12;

/**
* @brief classicLaneDetectModuleSelfCheckPrint函数
* @param[IN] param12, 空参数
* @param[IN] input12, classicLaneDetect类的对象
* @param[OUT] output12, 空输出
* @cn_name 车道线参数确认打印
* @granularity atomic 
* @tag perception
*/
void classicLaneDetectModuleSelfCheck (ParamStruct12 &,InputStruct12 &,OutputStruct12 &);




typedef struct{
    string path;
    vector<string> imageNames;
}ParamStruct13;


typedef struct{
  
}InputStruct13;


typedef struct{
   
}OutputStruct13;

/**
* @brief classicLaneDetectGetImagesName函数
* @param[IN] param13, 图片路径，图片名称
* @param[IN] input13, 空输入
* @param[OUT] output13, 空输出
* @cn_name 获取图片名称
* @granularity atomic 
* @tag perception
*/
void classicLaneDetectGetImagesName (ParamStruct13 &,InputStruct13 &,OutputStruct13 &);