#ifndef LIDAR_PERCEPTION_INCLUDE_LIDAR_PERCEPTION_LIDAR_PERCEPTION_H_
#define LIDAR_PERCEPTION_INCLUDE_LIDAR_PERCEPTION_LIDAR_PERCEPTION_H_

// #include <pcl_ros/point_cloud.h>
#include <rclcpp/rclcpp.hpp>
#include <sensor_msgs/msg/point_cloud2.hpp>

#include <iostream>
#include <memory>
#include <string>

#include "../support/lidar/detect/cluster/include/depth_cluster.h"
#include "../support/lidar/detect/cluster/include/euclidean_cluster.h"
#include "../support/lidar/detect/cluster/include/lidar_postprocessing.h"


#include "plusgo_msgs/msg/system_info_report.hpp"

#include <yaml-cpp/yaml.h>
#include <ament_index_cpp/get_package_share_directory.hpp>

namespace plusgo {
namespace perception {
namespace lidar {


class LidarPerception {
 public:
  /**
   * @brief Construct a new Lidar Perception object
   *
   * @param[in] nh Publish / subscribe nodehandle
   * @param[in] pnh Parameters nodehandle
   */
  explicit LidarPerception(std::shared_ptr<rclcpp::Node> nh, std::shared_ptr<rclcpp::Node> pnh);
  /**
   * @brief point cloud that has removed ground by lidar preprocess node
   *
   * @param[in] cloud_ptr cloud_ptr
   */
  void NoGroundCallback(sensor_msgs::msg::PointCloud2::ConstSharedPtr cloud_ptr);

 //params
 void ParamsSettingCallback(plusgo_msgs::msg::SystemInfoReport::ConstSharedPtr msg);


 private:
  //mutil params
  int indoor_;
  int outdoor_;
  int in_to_out_;
  int out_to_in_;
  float case0_filterheight_;
  float case1_filterheight_;

  std::string params_perception_topic_;
  std::string no_ground_topic_;

  //params
  // ros::Subscriber params_setting_subscriber_;
  rclcpp::Subscription<plusgo_msgs::msg::SystemInfoReport>::SharedPtr params_setting_subscriber_;
  // ros::Subscriber no_ground_subscriber_;
  rclcpp::Subscription<sensor_msgs::msg::PointCloud2>::SharedPtr no_ground_subscriber_;
  // ros::Publisher objects_pcd_pub_;
  rclcpp::Publisher<sensor_msgs::msg::PointCloud2>::SharedPtr objects_pcd_pub_;

  EuclideanCluster *eucli_cluster_;
  LidarPostprocessing *post_process_;
  
  int &MaxClusterSize = eucli_cluster_->max_cluster_size_;
  float &FilterObstacleHeight = post_process_->filter_obstacle_height_;

};
}  // namespace lidar
}  // namespace perception
}  // namespace plusgo
#endif  // LIDAR_PERCEPTION_INCLUDE_LIDAR_PERCEPTION_LIDAR_PERCEPTION_H_
