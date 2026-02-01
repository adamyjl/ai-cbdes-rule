#pragma once
/**
 * @brief 图像直方图归一化
 * @file funcHistogramNormalization.hpp
 * @version 0.0.1
 * @author Haotian Zheng
 * @date 2023-12-07
 */

#ifndef funcHistogramNormalization_hpp
#define funcHistogramNormalization_hpp

#include <opencv2/core.hpp>
#include"opencv2/imgproc/imgproc.hpp"
using namespace cv;
using namespace std;

typedef struct
{
  int topThre;
  int bottomThre;

} ParamStruct01;

typedef struct
{
  cv::Mat src;
} InputStruct01;

typedef struct
{
  cv::Mat des;
} OutputStruct01;

void histogramNormalization(const ParamStruct01 &, const InputStruct01 &, OutputStruct01 &);

// cv::Mat histogramNormalization(cv::Mat img, int topThre, int bottomThre);


#endif /* funcBinarization_hpp */
