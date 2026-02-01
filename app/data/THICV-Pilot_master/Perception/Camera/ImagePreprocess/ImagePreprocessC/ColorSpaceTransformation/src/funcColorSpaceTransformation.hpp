#pragma once
/**
 * @brief 文件说明 色彩空间变换
 * @file funcColorSpaceTransformation.hpp
 * @version 0.0.1
 * @author Haotian Zheng
 * @date 2020-11-28
 */

#ifndef funcColorSpaceTransformation_hpp
#define funcColorSpaceTransformation_hpp

#include <opencv2/core.hpp>
using namespace cv;
using namespace std;

typedef struct
{
  int colorCvtCode;

} ParamStruct01;

typedef struct
{
  cv::Mat src;
} InputStruct01;

typedef struct
{
  cv::Mat des;
} OutputStruct01;

void colorSpaceTransformation(const ParamStruct01 &, const InputStruct01 &, OutputStruct01 &);


#endif /* funcColorextraction_hpp */



