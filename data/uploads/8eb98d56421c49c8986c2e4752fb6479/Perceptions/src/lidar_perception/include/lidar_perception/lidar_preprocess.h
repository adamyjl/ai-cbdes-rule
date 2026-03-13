/*
 * @CopyRight: All Rights Reserved by Plusgo
 * @Author: SUN Yuzhe
 * @E-mail: sunyuzhe@plusgo.com.cn
 * @Date: 2022-04-06 20:22:56
 * @LastEditTime: 2022-11-05 10:06:30
 */
#ifndef LIDAR_PERCEPTION_INCLUDE_LIDAR_PERCEPTION_LIDAR_PREPROCESS_H_
#define LIDAR_PERCEPTION_INCLUDE_LIDAR_PERCEPTION_LIDAR_PREPROCESS_H_

#include <geometry_msgs/msg/polygon_stamped.hpp>
// #include <pcl_ros/point_cloud.h>
#include <pcl_conversions/pcl_conversions.h>
#include <rclcpp/rclcpp.hpp>
#include <sensor_msgs/msg/point_cloud2.hpp>
//#include <opencv2/opencv.hpp>

#include <iostream>
#include <string>
#include <vector>

#include "../support/common/mytimer.h"
#include "../support/lidar/common/include/pcd_transform.h"
#include "../support/lidar/common/include/roi_filter.h"
#include "../support/lidar/detect/ground_remove/include/ground_filter_ray.h"
#include "../support/lidar/detect/ground_remove/include/ground_remove.h"
#include "geometry_msgs/msg/polygon.hpp"
#include "pcl/impl/point_types.hpp"
#include "plusgo_msgs/msg/body_point_array.hpp"
#include "plusgo_msgs/msg/vehicle_location.hpp"
#include "plusgo_msgs/msg/system_info_report.hpp"

#include <yaml-cpp/yaml.h>
#include <ament_index_cpp/get_package_share_directory.hpp>

namespace plusgo {
namespace perception {
namespace lidar {

class LidarPreprocess {
 public:
  /**
   * @brief Construct a new Radar Perception object
   *
   * @param[in] nh Publish / subscribe nodehandle
   * @param[in] pnh Parameters nodehandle
   */
  explicit LidarPreprocess(std::shared_ptr<rclcpp::Node> nh, std::shared_ptr<rclcpp::Node> pnh);
  ~LidarPreprocess() {}
  /**
   * @brief middle lidar callback
   *
   * @param[in] cloud_ptr cloud_ptr
   */
  void LidarCallbackMiddle(sensor_msgs::msg::PointCloud2::ConstSharedPtr cloud_ptr);
  /**
   * @brief left lidar callback
   *
   * @param[in] cloud_ptr cloud_ptr
   */
  void LidarCallbackLeft(sensor_msgs::msg::PointCloud2::ConstSharedPtr cloud_ptr);
  /**
   * @brief right lidar callback
   *
   * @param[in] cloud_ptr cloud_ptr
   */
  void LidarCallbackRight(sensor_msgs::msg::PointCloud2::ConstSharedPtr cloud_ptr);
  /**
   * @brief plusgo_location callback
   * @details reserve
   * @param[in] location_ptr location_ptr
   */
  void LocationCallback(
      // const plusgo_msgs::msg::VehicleLocationConstPtr &location_ptr);
      plusgo_msgs::msg::VehicleLocation::ConstSharedPtr location_ptr);
  /**
   * @brief border map callback
   * @details convert map from vehicle_frame to base_link, buffer(shrink or
   * expand) map and then published buffered map as geometry_msgs::Polygon msg
   * @param[in] map_ptr map_ptr
   */
  // void MapCallback(
  //   //const plusgo_msgs::msg::BodyPointArrayConstPtr &map_ptr);
  //   plusgo_msgs::msg::BodyPointArray::ConstSharedPtr map_ptr);
  /**
   * @brief expand or shrink border map
   *
   * @param[in] maClipHeightStageOne: -0.8 #当距离大于10米且小于13米时使用该参数，LidarHeight+ClipHeightStageOne的值应为0.5p_ptr map_ptr
   * @param[in] distance buffer distance negative means shrink, positive means
   * expand
   * @param[out] map_msg buffered map msg
   */
  void BufferMapPolygon(
    //const plusgo_msgs::msg::BodyPointArrayConstPtr &map_ptr,
    plusgo_msgs::msg::BodyPointArray::ConstSharedPtr map_ptr,
                        const float distance,
                        geometry_msgs::msg::PolygonStamped::SharedPtr map_msg);
  /**
   * @brief convert border map to pcl format
   *
   * @param[in] map_ptr map_ptr
   * @param[out] map_hull map_hull
   */
  void BorderLine2MapHull(
    //const plusgo_msgs::msg::BodyPointArrayConstPtr &map_ptr,
    plusgo_msgs::msg::BodyPointArray::ConstSharedPtr map_ptr,
                          pcl::PointCloud<pcl::PointXYZ> &map_hull);
  /**
   * @brief Set the Default Map object
   *
   * @param[out] map_ptr default map is outer ROI
   */
  void SetDefaultMap(geometry_msgs::msg::PolygonStamped::SharedPtr map_msg);

  void ParamsSettingCallback(plusgo_msgs::msg::SystemInfoReport::ConstSharedPtr msg);
 private:
  std::string lidar_topic_middle_;
  std::string lidar_topic_left_;
  std::string lidar_topic_right_;
  std::string params_preprocess_topic_;
  std::string location_topic_;
  std::string map_topic_;

  // ros::Subscriber lidar_subscriber_left_;
  // ros::Subscriber lidar_subscriber_right_;
  // ros::Subscriber lidar_subscriber_middle_;
  // ros::Subscriber params_setting_subscriber_;
  // ros::Subscriber location_subscriber_;
  // ros::Subscriber map_subscriber_;
  
  rclcpp::Subscription<sensor_msgs::msg::PointCloud2>::SharedPtr lidar_subscriber_left_;
  rclcpp::Subscription<sensor_msgs::msg::PointCloud2>::SharedPtr lidar_subscriber_right_;
  rclcpp::Subscription<sensor_msgs::msg::PointCloud2>::SharedPtr lidar_subscriber_middle_;
  rclcpp::Subscription<plusgo_msgs::msg::SystemInfoReport>::SharedPtr params_setting_subscriber_;
  rclcpp::Subscription<plusgo_msgs::msg::VehicleLocation>::SharedPtr location_subscriber_;
  rclcpp::Subscription<plusgo_msgs::msg::BodyPointArray>::SharedPtr map_subscriber_;
  // ros::Publisher ground_pcd_pub_;
  // ros::Publisher no_ground_pcd_pub_;
  rclcpp::Publisher<sensor_msgs::msg::PointCloud2>::SharedPtr no_ground_pcd_pub_;
  // ros::Publisher buffer_map_pub_;
  rclcpp::Publisher<geometry_msgs::msg::PolygonStamped>::SharedPtr buffer_map_pub_;
  float map_buffer_size_;

  //multi params
  int up_hill_;
  int down_hill_;
  int no_hill_;
  
  bool middle_use_multi_clip_height_params_;
  bool left_use_multi_clip_height_params_;
  bool right_use_multi_clip_height_params_;

  float left_lidar_yaw_;
  float left_lidar_pitch_;
  float left_lidar_roll_;

  float right_lidar_yaw_;
  float right_lidar_pitch_;
  float right_lidar_roll_;

  float middle_lidar_yaw_;
  float middle_lidar_pitch_;
  float middle_lidar_roll_;

  float left_lidar_x_;
  float left_lidar_y_;
  float left_lidar_z_;

  float right_lidar_x_;
  float right_lidar_y_;
  float right_lidar_z_;

  float middle_lidar_x_;
  float middle_lidar_y_;
  float middle_lidar_z_;

  float minx_in_, maxx_in_, miny_in_, maxy_in_;
  float minx_out_, maxx_out_, miny_out_, maxy_out_, minz_out_, maxz_out_;

  pcl::PointCloud<pcl::PointXYZ> map_hull_;
  pcl::PointCloud<pcl::PointXYZI> scan_right_;
  pcl::PointCloud<pcl::PointXYZI> scan_left_;
  TransformPoints<pcl::PointXYZI> *transform_;
  ROIFilter<pcl::PointXYZI> *roi_filter_;
  GroundRemove *ground_remove_;
  GroundFilter_Ray *ground_filter_;
  float &LocalMaxSlope = ground_filter_->local_max_slope_;
};
}  // namespace lidar
}  // namespace perception
}  // namespace plusgo

#endif  // LIDAR_PERCEPTION_INCLUDE_LIDAR_PERCEPTION_LIDAR_PREPROCESS_H_
