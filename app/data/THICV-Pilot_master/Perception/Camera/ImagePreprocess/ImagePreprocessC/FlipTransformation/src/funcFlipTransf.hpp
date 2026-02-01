#pragma once
/**
 * @brief 图像翻转变换
 * @file funcFlipTransf.hpp
 * @version 0.0.1
 * @author Haotian Zheng
 * @date 2020-11-30
 */

#ifndef funcFlipTransf_hpp
#define funcFlipTransf_hpp

#include <opencv2/core.hpp>
#include"opencv2/imgproc/imgproc.hpp"
using namespace cv;
using namespace std;

typedef struct
{
  int flipCode;
  

} ParamStruct01;

typedef struct
{
  cv::Mat src;
} InputStruct01;

typedef struct
{
  cv::Mat des;
} OutputStruct01;

void flipTransformation(const ParamStruct01 &, const InputStruct01 &, OutputStruct01 &);
// void flipTransformation(cv::Mat imageSrc, cv::Mat &imageDst, int flipCode);

#endif /* funcBinarization_hpp */