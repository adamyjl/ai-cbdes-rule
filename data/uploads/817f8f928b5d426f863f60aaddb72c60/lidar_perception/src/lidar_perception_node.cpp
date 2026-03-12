/*
 * @CopyRight: All Rights Reserved by Plusgo
 * @Author: SUN Yuzhe
 * @E-mail: sunyuzhe@plusgo.com.cn
 * @Date: 2022-04-06 20:22:56
 * @LastEditTime: 2022-06-06 15:06:22
 */
#include <rclcpp/rclcpp.hpp>
// #include <ros/package.h>
#include "lidar_perception/lidar_perception.h"
#include "PLOG/log.h"

int main(int argc, char** argv) {
  std::string init_path=ament_index_cpp::get_package_share_directory("lidar_perception")+"/../../../records/perceptions-log";
  google::InitGoogleLogging(argv[0]);  //初始化
  LOG::Init(init_path,0,10,20,google::GLOG_INFO);  //初始化

  // ros::init(argc, argv, "lidar_perception");
  // ros::NodeHandle nh;
  // ros::NodeHandle pnh("~");
  rclcpp::init(argc, argv);
  auto nh = rclcpp::Node::make_shared("lidar_perception");
  auto pnh = rclcpp::Node::make_shared("lidar_perception");
  RCLCPP_WARN_STREAM(nh->get_logger(),"~~ ======================================= ~~");
  RCLCPP_WARN_STREAM(nh->get_logger(),"~~ ======  Plusgo Lidar Perception  ====== ~~");
  RCLCPP_WARN_STREAM(nh->get_logger(),"~~ ======================================= ~~");

  plusgo::perception::lidar::LidarPerception lidar_perception(nh, pnh);
  // ros::AsyncSpinner spinner(3);
  // spinner.start();
  // ros::waitForShutdown();
  rclcpp::spin(nh);
  google::ShutdownGoogleLogging();  // 全局关闭glog 
  return 0;
}
