#pragma once
/**
 * @brief 图像二值化
 * @file funcBinarization.hpp
 * @version 0.0.1
 * @author Chuang Zhang
 * @date 2020-11-28
 */

#ifndef funcBinarization_hpp
#define funcBinarization_hpp

#include <opencv2/core.hpp>
#include"opencv2/imgproc/imgproc.hpp"
using namespace cv;
using namespace std;

typedef struct
{
  double thresholdBinarization;
  double maxValue;

} ParamStruct01;

typedef struct
{
  cv::Mat src;
} InputStruct01;

typedef struct
{
  cv::Mat des;
} OutputStruct01;

void imageBinarization(const ParamStruct01 &, const InputStruct01 &, OutputStruct01 &);

#endif /* funcBinarization_hpp */
