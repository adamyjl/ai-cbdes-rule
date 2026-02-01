#pragma once
/**
 * @brief 图像坐标变换
 * @file funcCoordinateTransf.hpp
 * @version 0.0.1
 * @author Haotian Zheng
 * @date 2020-11-30
 */

#ifndef funcCoodinateTransf_hpp
#define funcCoodinateTransf_hpp

#include <opencv2/core.hpp>
#include"opencv2/imgproc/imgproc.hpp"
using namespace cv;
using namespace std;

typedef struct
{
  Mat map1;
  Mat map2;
  int interpolation;

} ParamStruct01;

typedef struct
{
  cv::Mat src;
} InputStruct01;

typedef struct
{
  cv::Mat des;
} OutputStruct01;

void coordinateTransformation(const ParamStruct01 &, const InputStruct01 &, OutputStruct01 &);
// void doCoordinateTransformation(cv::Mat imageSrc, cv::Mat &imageDst, Mat map1, Mat map2, int interpolation);

#endif /* funcBinarization_hpp */