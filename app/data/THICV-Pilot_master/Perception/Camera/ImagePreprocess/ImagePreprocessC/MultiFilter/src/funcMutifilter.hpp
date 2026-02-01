#pragma once
/**
 * @brief 图像滤波
 * @file funcMutifilter.hpp
 * @version 0.0.1
 * @author Haotian Zheng
 * @date 2020-12-04
 */

#ifndef funcMutifilter_hpp
#define funcMutifilter_hpp

#include <opencv2/core.hpp>
#include"opencv2/imgproc/imgproc.hpp"
using namespace cv;
using namespace std;

typedef struct
{
  int type;
} ParamStruct01;

typedef struct
{
  cv::Mat src;
} InputStruct01;

typedef struct
{
  cv::Mat des;
} OutputStruct01;

void imageFilter(const ParamStruct01 &, const InputStruct01 &, OutputStruct01 &);
// void mutifilter(cv::Mat imageSrc, cv::Mat &imageDst, int type);

#endif /* funcBinarization_hpp */