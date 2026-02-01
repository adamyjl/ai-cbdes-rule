/**
 * @brief 文件说明 
 * @file funcUFLD.hpp
 * @version 0.0.1
 * @author Chi Ding (dc22@mails.tsinghua.edu.com)
 * @date 2024-01-05
 */

#include <opencv2/opencv.hpp>
#include <opencv2/highgui.hpp>
#include <vector>
#include "UFLD.h"



typedef struct{
    string configFile;
}ParamStruct01;


typedef struct{
    UFLDLaneDetector UFLDlaneDetect;
}InputStruct01;


typedef struct{

}OutputStruct01;

/**
* @brief funcUFLDLaneDetectReadConfig函数
* @param[IN] param1, 配置文件文件名
* @param[IN] input1, UFLDLaneDetector类的对象
* @param[OUT] output1, 空输出
* @cn_name 读取配置
* @granularity atomic 
* @tag perception
*/
void funcUFLDLaneDetectReadConfig (ParamStruct01 &,InputStruct01 &,OutputStruct01 &);



typedef struct{
    string engineFile;
}ParamStruct02;

typedef struct{
    UFLDLaneDetector UFLDlaneDetect;
}InputStruct02;

typedef struct{

}OutputStruct02;

/**
* @brief funcUFLDLaneDetectInitTRTmodel函数
* @param[IN] param2, 模型文件文件名
* @param[IN] input2, UFLDLaneDetector类的对象
* @param[OUT] output2, 空输出
* @cn_name 初始化模型
* @granularity atomic 
* @tag perception
*/
void funcUFLDLaneDetectInitTRTmodel (ParamStruct02 &,InputStruct02 &,OutputStruct02 &);




typedef struct{
    string calibFile;
}ParamStruct03;


typedef struct{
    UFLDLaneDetector UFLDlaneDetect;
}InputStruct03;


typedef struct{

}OutputStruct03;

/**
* @brief funcUFLDLaneDetectInitCalib函数
* @param[IN] param3, 校准文件文件名
* @param[IN] input3, UFLDLaneDetector类的对象
* @param[OUT] output3, 空输出
* @cn_name 初始化校准
* @granularity atomic 
* @tag perception
*/
void funcUFLDLaneDetectInitCalib (ParamStruct03 &,InputStruct03 &,OutputStruct03 &);



typedef struct{
    Mat img;
    vector<float> processedImg;
}ParamStruct04;


typedef struct{
    UFLDLaneDetector UFLDlaneDetect;
}InputStruct04;


typedef struct{

}OutputStruct04;

/**
* @brief funcUFLDLaneDetectPreProcess函数
* @param[IN] param4, 图像，预处理参数
* @param[IN] input4, UFLDLaneDetector类的对象
* @param[OUT] output4, 空输出
* @cn_name 图像预处理
* @granularity atomic 
* @tag perception
*/
void funcUFLDLaneDetectPreProcess (ParamStruct04 &,InputStruct04 &,OutputStruct04 &);



typedef struct{
   IExecutionContext &context;
   float input;
   float output;
   int batchSize;
}ParamStruct05;


typedef struct{
    UFLDLaneDetector UFLDlaneDetect;
}InputStruct05;


typedef struct{

}OutputStruct05;

/**
* @brief funcUFLDLaneDetectDoInference函数
* @param[IN] param5, 推理执行，输入尺寸，输出尺寸，数据批量大小
* @param[IN] input5, UFLDLaneDetector类的对象
* @param[OUT] output5, 空输出
* @cn_name 模型推理
* @granularity atomic 
* @tag perception
*/
void funcUFLDLaneDetectDoInference (ParamStruct05 &,InputStruct05 &,OutputStruct05 &);



typedef struct{
    float x;
    float y;
    int rows;
    int cols;
    int chan;
}ParamStruct06;

typedef struct{
    UFLDLaneDetector UFLDlaneDetect;
}InputStruct06;


typedef struct{

}OutputStruct06;

/**
* @brief funcUFLDLaneDetectSoftmax_mul函数
* @param[IN] param6, 损失函数参数
* @param[IN] input6, UFLDLaneDetector类的对象
* @param[OUT] output6, 空输出
* @cn_name 损失函数计算
* @granularity atomic 
* @tag perception
*/
void funcUFLDLaneDetectSoftmax_mul (ParamStruct06 &,InputStruct06 &,OutputStruct06 &);



typedef struct{
    float x;
    float y;
    int rows;
    int cols;
    int chan;
}ParamStruct07;


typedef struct{
    UFLDLaneDetector UFLDlaneDetect;
}InputStruct07;

typedef struct{

}OutputStruct07;

/**
* @brief funcUFLDLaneDetectArgmax函数
* @param[IN] param7, 优化函数参数
* @param[IN] input7, UFLDLaneDetector类的对象
* @param[OUT] output7, 空输出
* @cn_name 最大值索引优化
* @granularity atomic 
* @tag perception
*/
void funcUFLDLaneDetectArgmax (ParamStruct07 &,InputStruct07 &,OutputStruct07 &);




typedef struct{

}ParamStruct08;


typedef struct{
    UFLDLaneDetector UFLDlaneDetect;
}InputStruct08;


typedef struct{

}OutputStruct08;

/**
* @brief funcUFLDLaneDetectPostProcess函数
* @param[IN] param8, 空参数
* @param[IN] input8, UFLDLaneDetector类的对象
* @param[OUT] output8, 空输出
* @cn_name 后处理
* @granularity atomic 
* @tag perception
*/
void funcUFLDLaneDetectPostProcess (ParamStruct08 &,InputStruct08 &,OutputStruct08 &);



typedef struct{

}ParamStruct09;

typedef struct{
    UFLDLaneDetector UFLDlaneDetect;
}InputStruct09;


typedef struct{
    bool outputlane;
}OutputStruct09;

/**
* @brief funcUFLDLaneDetectDisplay函数
* @param[IN] param9, 空参数
* @param[IN] input9, UFLDLaneDetector类的对象
* @param[OUT] output9, 是否打印
* @cn_name 车道线打印
* @granularity atomic 
* @tag perception
*/
void funcUFLDLaneDetectDisplay (ParamStruct09 &,InputStruct09 &,OutputStruct09 &);




typedef struct{

}ParamStruct10;


typedef struct{
    UFLDLaneDetector UFLDlaneDetect;
}InputStruct10;


typedef struct{

}OutputStruct10;

/**
* @brief funcUFLDLaneDetectToProto函数
* @param[IN] param10, 空参数
* @param[IN] input10, UFLDLaneDetector类的对象
* @param[OUT] output10, 空输出
* @cn_name 权重参数
* @granularity atomic 
* @tag perception
*/
void funcUFLDLaneDetectToProto (ParamStruct10 &,InputStruct10 &,OutputStruct10 &);




typedef struct{

}ParamStruct11;


typedef struct{
    UFLDLaneDetector UFLDlaneDetect;
}InputStruct11;


typedef struct{

}OutputStruct11;

/**
* @brief funcUFLDLaneDetectRun函数
* @param[IN] param11, 空参数
* @param[IN] input11, UFLDLaneDetector类的对象
* @param[OUT] output11, 空输出
* @cn_name 运行函数
* @granularity atomic 
* @tag perception
*/
void funcUFLDLaneDetectRun (ParamStruct11 &,InputStruct11 &,OutputStruct11 &);