/**
 * @brief 测试用例
 * @file main.cpp
 * @version 0.0.1
 * @author Chuang Zhang
 * @date 2023-11-28
 */

#include <iostream>
#include "../include/funcCoodinateTransf.hpp"

int main(int argc, const char *argv[])
{
  // insert code here...
  std::cout << "Hello, World!\n";
  cv::Mat imageInput = cv::imread("1.jpg", 0);

  ParamStruct01 pS01
  {
    .map1 = NULL;
    .map2 = NULL,;
    .interpolation = 255;
  };

  InputStruct01 iS01{
      .src = imageInput};

  OutputStruct01 oS01{
      .des = imageInput};

  imageBinarization(pS01, iS01, oS01);
  nameWindow("imageOutput", cv::WINDOW_AUTOSIZE);
  imshow("imageOutput", oS01.des);
  waitKey(1000);

  return 0;
}
