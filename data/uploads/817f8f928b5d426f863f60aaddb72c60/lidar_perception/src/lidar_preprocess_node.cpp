/*
 * @CopyRight: All Rights Reserved by Plusgo
 * @Author: SUN Yuzhe
 * @E-mail: sunyuzhe@plusgo.com.cn
 * @Date: 2022-04-06 20:22:56
 * @LastEditTime: 2022-06-06 15:05:53
 */
#include <rclcpp/rclcpp.hpp>
// #include <ros/package.h>
#include "lidar_perception/lidar_preprocess.h"

#include "PLOG/log.h"

int main(int argc, char** argv) {
  
  std::string init_path=ament_index_cpp::get_package_share_directory("lidar_perception")+"/../../../records/perceptions-log";
  google::InitGoogleLogging(argv[0]);  //初始化
  LOG::Init(init_path,0,10,20,google::GLOG_INFO);  //初始化

  // ros::init(argc, argv, "lidar_preprocess");
  // ros::NodeHandle nh;
  // ros::NodeHandle pnh("~");
  rclcpp::init(argc, argv);
  auto nh = rclcpp::Node::make_shared("lidar_preprocess");
  auto pnh = rclcpp::Node::make_shared("lidar_preprocess");
  RCLCPP_WARN_STREAM(nh->get_logger(), "~~ ======================================= ~~");
  RCLCPP_WARN_STREAM(nh->get_logger(), "~~ ======  Plusgo Lidar Preprocess  ====== ~~");
  RCLCPP_WARN_STREAM(nh->get_logger(), "~~ ======================================= ~~");
  
  plusgo::perception::lidar::LidarPreprocess lidar_preprocess(nh, pnh);
  // ros::AsyncSpinner spinner(5);
  // spinner.start();
  // ros::waitForShutdown();
  rclcpp::spin(nh);
  google::ShutdownGoogleLogging();  // 全局关闭glog 
  return 0;
}
