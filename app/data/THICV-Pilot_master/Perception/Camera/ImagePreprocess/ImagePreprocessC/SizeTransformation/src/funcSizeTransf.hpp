#pragma once
/**
 * @brief 图像预处理-chicunbianhuan
 * @file funcSizeTransf.hpp
 * @version 0.0.1
 * @author Haotian Zheng
 * @date 2020-11-29
 */

#ifndef funcSizetransf_hpp
#define funcSizetransf_hpp

#include <opencv2/core.hpp>
using namespace cv;
using namespace std;

typedef struct
{
  int width;
  int height;

} ParamStruct01;

typedef struct
{
  cv::Mat src;
} InputStruct01;

typedef struct
{
  cv::Mat des;
} OutputStruct01;

void sizeTransformation(const ParamStruct01 &, const InputStruct01 &, OutputStruct01 &);
// void sizeTransformation(cv::Mat imageSrc, cv::Mat &imageDst, int width, int height);

#endif /* funcBinarization_hpp */
