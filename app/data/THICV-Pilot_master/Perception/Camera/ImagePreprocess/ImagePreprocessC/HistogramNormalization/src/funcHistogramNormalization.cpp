/**
 * @brief 图像直方图归一化
 * @file funcHistogramNormalization.cpp
 * @version 0.0.1
 * @author Haotian Zheng
 * @date 2023-12-07
 */

#include "funcHistogramNormalization.hpp"

/**
 * @brief 图像直方图归一化
 * @param[IN] param 
 * @param[IN] input 输入图像
 * @param[OUT] output 输出图像
 * @cn_name: 图像直方图归一化
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void histogramNormalization(const ParamStruct01 &param01, const InputStruct01 &input01, OutputStruct01 &output01)
{
  // cv::threshold(input01.src, output01.des, param01.thresholdBinarization, param01.maxValue, cv::THRESH_BINARY);
  int width = input01.src.cols;
  int height = input01.src.rows;
  int channel = input01.src.channels();

  int c, d;
  int val;


  cv::Mat out = cv::Mat::zeros(height, width, CV_8UC3);

  for (int y = 0; y < height; y++)
  {
    for (int x = 0; x < width; x++)
    {
      for (int _c = 0; _c < channel; _c++)
      {
        val = (float)input01.src.at<cv::Vec3b>(y, x)[_c];
        c = fmin(c, val);
        d = fmax(d, val);
      }
    }
  }

  for (int y = 0; y < height; y++)
    {
      for (int x = 0; x < width; x++)
      {
        for (int _c = 0; _c < 3; _c++)
        {
          val = input01.src.at<cv::Vec3b>(y, x)[_c];

          if (val < param01.topThre)
          {
            out.at<cv::Vec3b>(y, x)[_c] = (uchar)param01.topThre;
          }
          else if (val <= param01.bottomThre)
          {
            out.at<cv::Vec3b>(y, x)[_c] = (uchar)((param01.bottomThre - a) / (d - c) * (val - c) + topThre);
          }
          else
          {
            out.at<cv::Vec3b>(y, x)[_c] = (uchar)param01.bottomThre;
          }
        }
      }
    }

  output01.des = out;

}

