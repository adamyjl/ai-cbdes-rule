/*
 * @CopyRight: All Rights Reserved by Plusgo
 * @Author: SUN Yuzhe
 * @E-mail: sunyuzhe@plusgo.com.cn
 * @Date: 2022-04-06 20:22:56
 * @LastEditTime: 2022-11-05 15:53:51
 */
#include "lidar_perception/lidar_preprocess.h"
#include <cstddef>
#include "geometry_msgs/msg/point32.hpp"
#include "geometry_msgs/msg/polygon_stamped.hpp"
#include "pcl/impl/point_types.hpp"
#include "sensor_msgs/msg/point_cloud2.hpp"

#include <boost/geometry.hpp>
#include <boost/geometry/algorithms/append.hpp>
#include <boost/geometry/geometries/geometries.hpp>
#include <boost/geometry/geometries/point_xy.hpp>
#include <boost/geometry/geometries/polygon.hpp>
#include "PLOG/log.h"
#include <yaml-cpp/yaml.h>
#include <ament_index_cpp/get_package_share_directory.hpp>

namespace plusgo {
namespace perception {
namespace lidar {

typedef boost::geometry::model::d2::point_xy<double> point_type;
typedef boost::geometry::model::polygon<point_type> polygon;
using boost::geometry::append;
using boost::geometry::correct;
using boost::geometry::make;



//ROS Header <---> PCL Header
pcl::PCLHeader ConvertROSHeader2PCLHeader(const std_msgs::msg::Header &_header) {
  pcl::PCLHeader header;
  // header.seq = _header.seq;
  header.stamp = pcl_conversions::toPCL(_header.stamp);
  header.frame_id = _header.frame_id;
  return header;
}

std_msgs::msg::Header ConvertPCLHeader2ROSHeader(const pcl::PCLHeader &_header) {
  std_msgs::msg::Header header;
  // header.seq = _header.seq;
  header.stamp = pcl_conversions::fromPCL(_header.stamp);
  header.frame_id = _header.frame_id;
  return header;
}
// 预处理函数
// LidarPreprocess::LidarPreprocess(std::shared_ptr<rclcpp::Node> nh, std::shared_ptr<rclcpp::Node> pnh)
//     : ground_remove_(new GroundRemove(nh, pnh)),
//       ground_filter_(new GroundFilter_Ray(nh, pnh)),
//       roi_filter_(new ROIFilter<pcl::PointXYZI>()),
//       transform_(new TransformPoints<pcl::PointXYZI>()) {
//   pnh.param("LidarTopicMiddle", lidar_topic_middle_, std::string("/middle"));
//   pnh.param("LidarTopicLeft", lidar_topic_left_, std::string("/left"));
//   pnh.param("LidarTopicRight", lidar_topic_right_, std::string("/right"));

//   pnh.param("ParamsSetting", params_preprocess_topic_, std::string("/params"));

//   pnh.param("LocationTopic", location_topic_, std::string("/location"));
//   pnh.param("MapTopic", map_topic_, std::string("/map"));
//   pnh.param<float>("MapBufferSize", map_buffer_size_, 0.0);
  
//   //multi params
//   pnh.param<int>("UpHill", up_hill_, 6);
//   pnh.param<int>("DownHill", down_hill_, 7);
//   pnh.param<int>("NoHill", no_hill_, 5);

//   // left and right lidar calibration
//   pnh.param<float>("LeftLidarYawAngle", left_lidar_yaw_, 0.0);
//   pnh.param<float>("LeftLidarPitchAngle", left_lidar_pitch_, 0.0);
//   pnh.param<float>("LeftLidarRollAngle", left_lidar_roll_, 0.0);
//   pnh.param<float>("RightLidarYawAngle", right_lidar_yaw_, 0.0);
//   pnh.param<float>("RightLidarPitchAngle", right_lidar_pitch_, 0.0);
//   pnh.param<float>("RightLidarRollAngle", right_lidar_roll_, 0.0);
//   pnh.param<float>("MiddleLidarYawAngle", middle_lidar_yaw_, 0.0);
//   pnh.param<float>("MiddleLidarPitchAngle", middle_lidar_pitch_, 0.0);
//   pnh.param<float>("MiddleLidarRollAngle", middle_lidar_roll_, 0.0);

//   pnh.param<float>("LeftLidarOffsetX", left_lidar_x_, 0.0);
//   pnh.param<float>("LeftLidarOffsetY", left_lidar_y_, 0.0);
//   pnh.param<float>("LeftLidarOffsetZ", left_lidar_z_, 0.0);
//   pnh.param<float>("RightLidarOffsetX", right_lidar_x_, 0.0);
//   pnh.param<float>("RightLidarOffsetY", right_lidar_y_, 0.0);
//   pnh.param<float>("RightLidarOffsetZ", right_lidar_z_, 0.0);
//   pnh.param<float>("MiddleLidarOffsetX", middle_lidar_x_, 0.0);
//   pnh.param<float>("MiddleLidarOffsetY", middle_lidar_y_, 0.0);
//   pnh.param<float>("MiddleLidarOffsetZ", middle_lidar_z_, 0.0);

//   // ROI inner
//   pnh.param<float>("MinInnerX", minx_in_, -1);
//   pnh.param<float>("MaxInnerX", maxx_in_, 1);
//   assert(maxx_in_ > 0 && maxx_in_ > minx_in_);

//   pnh.param<float>("MinInnerY", miny_in_, -1);
//   pnh.param<float>("MaxInnerY", maxy_in_, 1);
//   assert(maxy_in_ > 0 && maxy_in_ > miny_in_);

//   // ROI outer
//   pnh.param<float>("MinOuterX", minx_out_, -100);
//   pnh.param<float>("MaxOuterX", maxx_out_, 200);
//   assert(maxx_out_ > 0 && maxx_out_ > minx_out_ && maxx_out_ > maxx_in_);

//   pnh.param<float>("MinOuterY", miny_out_, -100);
//   pnh.param<float>("MaxOuterY", maxy_out_, 100);
//   assert(maxy_out_ > 0 && maxy_out_ > miny_out_ && maxy_out_ > maxy_in_);

//   pnh.param<float>("MinOuterZ", minz_out_, -3);
//   pnh.param<float>("MaxOuterZ", maxz_out_, 3);
//   assert(maxz_out_ >= 0 && maxz_out_ > minz_out_);

//   pnh.param<bool>("MiddleUseMultiClipHeightParams", middle_use_multi_clip_height_params_, false);
//   pnh.param<bool>("LetfUseMultiClipHeightParams", left_use_multi_clip_height_params_, false); 
//   pnh.param<bool>("RightUseMultiClipHeightParams", right_use_multi_clip_height_params_, false);   
  
//   // subscrib params setting topic
//   params_setting_subscriber_ = nh.subscribe(params_preprocess_topic_, 1, &LidarPreprocess::ParamsSettingCallback, this);

//   lidar_subscriber_middle_ = nh.subscribe(
//       lidar_topic_middle_, 1, &LidarPreprocess::LidarCallbackMiddle, this);
//   lidar_subscriber_left_ = nh.subscribe(
//       lidar_topic_left_, 1, &LidarPreprocess::LidarCallbackLeft, this);
//   lidar_subscriber_right_ = nh.subscribe(
//       lidar_topic_right_, 1, &LidarPreprocess::LidarCallbackRight, this);


//   location_subscriber_ = nh.subscribe(location_topic_, 1,
//                                       &LidarPreprocess::LocationCallback, this);
//   map_subscriber_ =
//       nh.subscribe(map_topic_, 1, &LidarPreprocess::MapCallback, this);

//   //   ground_pcd_pub_ = nh->create_publisher<sensor_msgs::PointCloud2>("ground_pcd",
//   //   1);
//   no_ground_pcd_pub_ =
//       nh->create_publisher<sensor_msgs::msg::PointCloud2>("no_ground_pcd", 1, true);
//   buffer_map_pub_ =
//       nh->create_publisher<geometry_msgs::msg::PolygonStamped>("/map_expand", 1, true);
// }

LidarPreprocess::LidarPreprocess(std::shared_ptr<rclcpp::Node> nh, std::shared_ptr<rclcpp::Node> pnh)
    : ground_remove_(new GroundRemove()),
      ground_filter_(new GroundFilter_Ray()),
      roi_filter_(new ROIFilter<pcl::PointXYZI>()),
      transform_(new TransformPoints<pcl::PointXYZI>()) {
  std::string yaml_path = ament_index_cpp::get_package_share_directory("lidar_perception") + "/../../../../src/lidar_perception/params/lidar_preprocess.yaml";
  std::cout << "yaml_path: " << yaml_path << std::endl;
  YAML::Node config = YAML::LoadFile(yaml_path);
  
  lidar_topic_middle_ = config["LidarTopicMiddle"].as<std::string>();
  lidar_topic_left_ = config["LidarTopicLeft"].as<std::string>();
  lidar_topic_right_ = config["LidarTopicRight"].as<std::string>();
  params_preprocess_topic_ = config["ParamsSetting"].as<std::string>();
  location_topic_ = config["LocationTopic"].as<std::string>();
  map_topic_ = config["MapTopic"].as<std::string>();
  
  map_buffer_size_ = config["MapBufferSize"].as<float>();
  left_lidar_yaw_ = config["LeftLidarYawAngle"].as<float>();
  left_lidar_pitch_ = config["LeftLidarPitchAngle"].as<float>();
  left_lidar_roll_ = config["LeftLidarRollAngle"].as<float>();
  right_lidar_yaw_ = config["RightLidarYawAngle"].as<float>();
  right_lidar_pitch_ = config["RightLidarPitchAngle"].as<float>();
  right_lidar_roll_ = config["RightLidarRollAngle"].as<float>();
  middle_lidar_yaw_ = config["MiddleLidarYawAngle"].as<float>();
  middle_lidar_pitch_ = config["MiddleLidarPitchAngle"].as<float>();
  middle_lidar_roll_ = config["MiddleLidarRollAngle"].as<float>();
  left_lidar_x_ = config["LeftLidarOffsetX"].as<float>();
  left_lidar_y_ = config["LeftLidarOffsetY"].as<float>();
  left_lidar_z_ = config["LeftLidarOffsetZ"].as<float>();
  right_lidar_x_ = config["RightLidarOffsetX"].as<float>();
  right_lidar_y_ = config["RightLidarOffsetY"].as<float>();
  right_lidar_z_ = config["RightLidarOffsetZ"].as<float>();
  middle_lidar_x_ = config["MiddleLidarOffsetX"].as<float>();
  middle_lidar_y_ = config["MiddleLidarOffsetY"].as<float>();
  middle_lidar_z_ = config["MiddleLidarOffsetZ"].as<float>();

  minx_in_ = config["MinInnerX"].as<float>();
  maxx_in_ = config["MaxInnerX"].as<float>();
  assert(maxx_in_ > 0 && maxx_in_ > minx_in_);
  miny_in_ = config["MinInnerY"].as<float>();
  maxy_in_ = config["MaxInnerY"].as<float>();
  assert(maxy_in_ > 0 && maxy_in_ > miny_in_);
  minx_out_ = config["MinOuterX"].as<float>();
  maxx_out_ = config["MaxOuterX"].as<float>();
  assert(maxx_out_ > 0 && maxx_out_ > minx_out_ && maxx_out_ > maxx_in_);
  miny_out_ = config["MinOuterY"].as<float>();
  maxy_out_ = config["MaxOuterY"].as<float>();
  assert(maxy_out_ > 0 && maxy_out_ > miny_out_ && maxy_out_ > maxy_in_);
  minz_out_ = config["MinOuterZ"].as<float>();
  maxz_out_ = config["MaxOuterZ"].as<float>();
  assert(maxz_out_ >= 0 && maxz_out_ > minz_out_);

  up_hill_ = config["UpHill"].as<int>();
  down_hill_ = config["DownHill"].as<int>();
  no_hill_ = config["NoHill"].as<int>();

  middle_use_multi_clip_height_params_ = config["MiddleUseMultiClipHeightParams"].as<bool>();
  left_use_multi_clip_height_params_ = config["LeftUseMultiClipHeightParams"].as<bool>();
  right_use_multi_clip_height_params_ = config["RightUseMultiClipHeightParams"].as<bool>();
  
  
  // subscrib params setting topic
  // params_setting_subscriber_ = nh->create_subscription<plusgo_msgs::msg::SystemInfoReport>(params_preprocess_topic_, 1, std::bind(&LidarPreprocess::ParamsSettingCallback, this, _1));
  // lidar_subscriber_middle_ = nh->create_subscription<sensor_msgs::msg::PointCloud2>(lidar_topic_middle_, 1, std::bind(&LidarPreprocess::LidarCallbackMiddle, this, _1));
  // lidar_subscriber_left_ = nh->create_subscription<sensor_msgs::msg::PointCloud2>(lidar_topic_left_, 1, std::bind(&LidarPreprocess::LidarCallbackLeft, this, _1));
  // lidar_subscriber_right_ = nh->create_subscription<sensor_msgs::msg::PointCloud2>(lidar_topic_right_, 1, std::bind(&LidarPreprocess::LidarCallbackRight, this, _1));
  // location_subscriber_ = nh->create_subscription<plusgo_msgs::msg::VehicleLocation>(location_topic_, 1, std::bind(&LidarPreprocess::LocationCallback, this, _1));
  params_setting_subscriber_ = nh->create_subscription<plusgo_msgs::msg::SystemInfoReport>(
    params_preprocess_topic_, 1, 
    [this](const plusgo_msgs::msg::SystemInfoReport::SharedPtr msg) {
        this->ParamsSettingCallback(msg);
    });

  lidar_subscriber_middle_ = nh->create_subscription<sensor_msgs::msg::PointCloud2>(
    lidar_topic_middle_, 1, 
    [this](const sensor_msgs::msg::PointCloud2::SharedPtr msg) {
        this->LidarCallbackMiddle(msg);
    });
  
  lidar_subscriber_left_ = nh->create_subscription<sensor_msgs::msg::PointCloud2>(
    lidar_topic_left_, 1, 
    [this](const sensor_msgs::msg::PointCloud2::SharedPtr msg) {
        this->LidarCallbackLeft(msg);
    });
  
  lidar_subscriber_right_ = nh->create_subscription<sensor_msgs::msg::PointCloud2>(
    lidar_topic_right_, 1, 
    [this](const sensor_msgs::msg::PointCloud2::SharedPtr msg) {
        this->LidarCallbackRight(msg);
    });

  location_subscriber_ = nh->create_subscription<plusgo_msgs::msg::VehicleLocation>(
    lidar_topic_right_, 1, 
    [this](const plusgo_msgs::msg::VehicleLocation::SharedPtr msg) {
        this->LocationCallback(msg);
    });
  // map_subscriber_ = nh->create_subscription<plusgo_msgs::msg::SystemInfoReport>(map_topic_, 1, LidarPreprocess::MapCallback);

  //   ground_pcd_pub_ = nh->create_publisher<sensor_msgs::PointCloud2>("ground_pcd", 1);
  no_ground_pcd_pub_ =
      nh->create_publisher<sensor_msgs::msg::PointCloud2>("no_ground_pcd", 1);
  // buffer_map_pub_ =
  //     nh->create_publisher<geometry_msgs::msg::PolygonStamped>("/map_expand", 1);
}

void LidarPreprocess::ParamsSettingCallback(plusgo_msgs::msg::SystemInfoReport::ConstSharedPtr msg){
    int is_slope_ = msg->slope_state;
    int in_where_ = msg->out_or_indoor;
    int is_only_ = msg->special_cases;

    PINFO<<"is_slope:"<<is_slope_;
    PINFO<<"in_where:"<<in_where_;
    PINFO<<"is_only:"<<is_only_;
    if(is_only_ == 0){
      if(is_slope_ == 0) 
      {// no hill
        LocalMaxSlope = no_hill_;  
      }
      else if (is_slope_ == 1)
      {// up hill
        LocalMaxSlope = up_hill_;
      }
      else
      {// down hill
        LocalMaxSlope = down_hill_;
      }
      //std::cout<<"LocalMaxSlope: "<< LocalMaxSlope << std::endl;
    }
    if(is_only_ == 1){
      if(is_slope_ == 0) 
      {// no hill
        LocalMaxSlope = no_hill_;  
      }
      else if (is_slope_ == 1)
      {// up hill
        LocalMaxSlope = up_hill_;
      }
      else
      {// down hill
        LocalMaxSlope = down_hill_;
      }
      //std::cout<<"LocalMaxSlope: "<< LocalMaxSlope << std::endl;
    }
}

void LidarPreprocess::LidarCallbackMiddle(
    sensor_msgs::msg::PointCloud2::ConstSharedPtr cloud_ptr) {
  // RCLCPP_INFO_STREAM(nh->get_logger(), "Lidar middle callback");
  PINFO<<"Lidar middle callback";
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_original(
      new pcl::PointCloud<pcl::PointXYZI>);
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_polygon(
      new pcl::PointCloud<pcl::PointXYZI>);
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_roi_original(
      new pcl::PointCloud<pcl::PointXYZI>);

  pcl::fromROSMsg(*cloud_ptr, *cloud_original);
  std::vector<int> indices;
  pcl::removeNaNFromPointCloud(*cloud_original, *cloud_original, indices);
  if ((abs(middle_lidar_x_) + abs(middle_lidar_y_) + abs(middle_lidar_z_) +
       abs(middle_lidar_yaw_) + abs(middle_lidar_pitch_) +
       abs(middle_lidar_roll_)) != 0) {
    PINFO<<"Main Lidar calibrated.";
    //ROS_WARN_STREAM("Main Lidar calibrated.");
    // 旋转标定
    transform_->RotatePointCloud(cloud_original, cloud_original,
                                 middle_lidar_yaw_, middle_lidar_pitch_,
                                 middle_lidar_roll_, 0, 0, middle_lidar_z_);
  }
  roi_filter_->RoiPointCloudOuter(cloud_original, cloud_roi_original, minx_out_,
                                  maxx_out_, miny_out_, maxy_out_, minz_out_,
                                  maxz_out_);
  std_msgs::msg::Header map_header = ConvertPCLHeader2ROSHeader(map_hull_.header);
  /// map 20 hz, if map update normally, time diff less than 0.05s
  // if (abs(map_header.stamp.toSec() - cloud_ptr->header.stamp.toSec()) < 0.1 &&
  if (abs(map_header.stamp.sec - cloud_ptr->header.stamp.sec) < 0.1 &&
      map_hull_.size() != 0) {
    roi_filter_->RoiRoadbedPolygon(map_hull_.makeShared(), cloud_roi_original,
                                   cloud_polygon);
    cloud_roi_original->clear();
    pcl::copyPointCloud(*cloud_polygon, *cloud_roi_original);
  }
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_roi(
      new pcl::PointCloud<pcl::PointXYZI>);
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_roi_ground(
      new pcl::PointCloud<pcl::PointXYZI>);

  ground_filter_->RemoveGroundPoints(cloud_roi_original, cloud_roi,
                                     cloud_roi_ground,middle_use_multi_clip_height_params_);
  //ROS_DEBUG_STREAM("cloud_roi: " << cloud_roi->size());
  pcl::PointCloud<pcl::PointXYZI>::Ptr scan_multi(
      new pcl::PointCloud<pcl::PointXYZI>);
  transform_->RotatePointCloud(cloud_roi, cloud_roi, 0, 0, 0, middle_lidar_x_,
                               middle_lidar_y_, 0);
  *scan_multi = scan_left_ + *cloud_roi;
  *scan_multi = *scan_multi + scan_right_;

  roi_filter_->RoiPointCloudInner(scan_multi, scan_multi, minx_in_, maxx_in_,
                                  miny_in_, maxy_in_);
  sensor_msgs::msg::PointCloud2 no_ground_msg;
  pcl::toROSMsg(*scan_multi, no_ground_msg);
  no_ground_msg.header = cloud_ptr->header;
  no_ground_pcd_pub_->publish(no_ground_msg);
}
void LidarPreprocess::LidarCallbackLeft(
    sensor_msgs::msg::PointCloud2::ConstSharedPtr cloud_ptr) {
  // plusgo::PlusgoTimer lidarTimer("lidarCallbackLeft");
  // RCLCPP_INFO_STREAM(nh->get_logger(), "Lidar left callback");
  PINFO<<"Lidar left callback";
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_original(
      new pcl::PointCloud<pcl::PointXYZI>);
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_polygon(
      new pcl::PointCloud<pcl::PointXYZI>);
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_roi_original(
      new pcl::PointCloud<pcl::PointXYZI>);

  pcl::fromROSMsg(*cloud_ptr, *cloud_original);
  std::vector<int> indices;
  pcl::removeNaNFromPointCloud(*cloud_original, *cloud_original, indices);
  // 旋转标定
  transform_->RotatePointCloud(cloud_original, cloud_original, left_lidar_yaw_,
                               left_lidar_pitch_, left_lidar_roll_, 0, 0,
                               left_lidar_z_);
  roi_filter_->RoiPointCloudOuter(cloud_original, cloud_roi_original, minx_out_,
                                  maxx_out_, miny_out_, maxy_out_, minz_out_,
                                  maxz_out_);
  std_msgs::msg::Header map_header = ConvertPCLHeader2ROSHeader(map_hull_.header);
  if (abs(map_header.stamp.sec - cloud_ptr->header.stamp.sec) < 0.1 &&
      map_hull_.size() != 0) {
    roi_filter_->RoiRoadbedPolygon(map_hull_.makeShared(), cloud_roi_original,
                                   cloud_polygon);
    cloud_roi_original->clear();
    pcl::copyPointCloud(*cloud_polygon, *cloud_roi_original);
  }
  // 地面去除
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_roi(
      new pcl::PointCloud<pcl::PointXYZI>);
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_roi_ground(
      new pcl::PointCloud<pcl::PointXYZI>);
  ground_filter_->RemoveGroundPoints(cloud_roi_original, cloud_roi,
                                     cloud_roi_ground,left_use_multi_clip_height_params_);
  transform_->RotatePointCloud(cloud_roi, cloud_roi, 0, 0, 0, left_lidar_x_,
                               left_lidar_y_, 0);
  scan_left_ = *cloud_roi;
  // lidarTimer.endTimer();
  //ROS_DEBUG_STREAM("Left ROI Cloud size: " << cloud_roi->size());
}
void LidarPreprocess::LidarCallbackRight(
    sensor_msgs::msg::PointCloud2::ConstSharedPtr cloud_ptr) {
  // RCLCPP_INFO_STREAM(nh->get_logger(), "Lidar right callback");
  PINFO<<"Lidar right callback";
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_original(
      new pcl::PointCloud<pcl::PointXYZI>);
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_polygon(
      new pcl::PointCloud<pcl::PointXYZI>);
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_roi_original(
      new pcl::PointCloud<pcl::PointXYZI>);

  pcl::fromROSMsg(*cloud_ptr, *cloud_original);
  std::vector<int> indices;
  pcl::removeNaNFromPointCloud(*cloud_original, *cloud_original, indices);
  // 旋转标定
  transform_->RotatePointCloud(cloud_original, cloud_original, right_lidar_yaw_,
                               right_lidar_pitch_, right_lidar_roll_, 0, 0,
                               right_lidar_z_);
  roi_filter_->RoiPointCloudOuter(cloud_original, cloud_roi_original, minx_out_,
                                  maxx_out_, miny_out_, maxy_out_, minz_out_,
                                  maxz_out_);
  std_msgs::msg::Header map_header = ConvertPCLHeader2ROSHeader(map_hull_.header);
  if (abs(map_header.stamp.sec - cloud_ptr->header.stamp.sec) < 0.1 &&
      map_hull_.size() != 0) {
    roi_filter_->RoiRoadbedPolygon(map_hull_.makeShared(), cloud_roi_original,
                                   cloud_polygon);
    cloud_roi_original->clear();
    pcl::copyPointCloud(*cloud_polygon, *cloud_roi_original);
  }
  // 地面去除
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_roi(
      new pcl::PointCloud<pcl::PointXYZI>);
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_roi_ground(
      new pcl::PointCloud<pcl::PointXYZI>);
  ground_filter_->RemoveGroundPoints(cloud_roi_original, cloud_roi,
                                     cloud_roi_ground,right_use_multi_clip_height_params_);
  transform_->RotatePointCloud(cloud_roi, cloud_roi, 0, 0, 0, right_lidar_x_,
                               right_lidar_y_, 0);
  scan_right_ = *cloud_roi;
  //ROS_DEBUG_STREAM("Right ROI Cloud size: " << cloud_roi->size());
}

void LidarPreprocess::LocationCallback(
    plusgo_msgs::msg::VehicleLocation::ConstSharedPtr location_ptr) {
  //ROS_INFO_STREAM_THROTTLE(0.1, "Location info callback");
  PINFO<<"Location info callback";
  //   车辆定位及速度信息，后面用于做点云畸变校正　frame_id base_link
}

void LidarPreprocess::SetDefaultMap(geometry_msgs::msg::PolygonStamped::SharedPtr map_msg) {
  map_msg->polygon.points.resize(5);
  map_msg->polygon.points[0].x = minx_out_;
  map_msg->polygon.points[0].y = miny_out_;
  map_msg->polygon.points[0].z = 0;

  map_msg->polygon.points[1].x = maxx_out_;
  map_msg->polygon.points[1].y = miny_out_;
  map_msg->polygon.points[1].z = 0;

  map_msg->polygon.points[2].x = maxx_out_;
  map_msg->polygon.points[2].y = maxy_out_;
  map_msg->polygon.points[2].z = 0;

  map_msg->polygon.points[3].x = minx_out_;
  map_msg->polygon.points[3].y = maxy_out_;
  map_msg->polygon.points[3].z = 0;

  map_msg->polygon.points[4].x = minx_out_;
  map_msg->polygon.points[4].y = miny_out_;
  map_msg->polygon.points[4].z = 0;
}

// void LidarPreprocess::MapCallback(
//     plusgo_msgs::msg::BodyPointArray::ConstSharedPtr map_ptr) {
//   // RCLCPP_INFO_STREAM(nh->get_logger(), "Map callback, map size " << map_ptr->array.size());
//   PINFO<<"Map callback, map size " << map_ptr->array.size();
//   geometry_msgs::msg::PolygonStamped::SharedPtr buffer_map(
//       new geometry_msgs::msg::PolygonStamped);
//   buffer_map->header = map_ptr->header;
//   /// @todo　暂时设为rslidar, 地图坐标系应该为base_link
//   buffer_map->header.frame_id = "rslidar";  // vehicle_frame->base_link
//   if (map_ptr->array.empty()) {
//     PWARN<<"Map empty! using default border.";
//     //ROS_ERROR_STREAM("Map empty! using default border.");
//     SetDefaultMap(buffer_map);
//     buffer_map_pub_->publish(buffer_map);
//     return;
//   }
//   BufferMapPolygon(map_ptr, map_buffer_size_, buffer_map);
//   buffer_map_pub_->publish(buffer_map);
// }
void LidarPreprocess::BufferMapPolygon(
    plusgo_msgs::msg::BodyPointArray::ConstSharedPtr map_ptr, const float distance,
    geometry_msgs::msg::PolygonStamped::SharedPtr map_msg) {
    // judge if map effective
    polygon map_polygon;
    for (const auto &pt : map_ptr->array) {
      boost::geometry::append(map_polygon, make<point_type>(pt.x, pt.y));
    }
    correct(map_polygon);
    bool map_intersects = boost::geometry::intersects(map_polygon);
    // if map have intersects, use default ROI
    if (map_intersects) {
      //ROS_ERROR_STREAM("Map crossing or self-tangency! using default border.");
      PWARN<<"Map crossing or self-tangency! using default border.";
      SetDefaultMap(map_msg);
      return;
    }
    // Declare strategies
    // <=4就是9个点,>4(最少5个点)比扩展前点多就至少拐角补一个点,>2*size(最少9个点)补两个点
    const int points_per_circle = map_ptr->array.size() + 1;
    boost::geometry::strategy::buffer::distance_symmetric<double>
        distance_strategy(distance);
    boost::geometry::strategy::buffer::join_round join_strategy(
        points_per_circle);
    boost::geometry::strategy::buffer::end_round end_strategy(points_per_circle);
    boost::geometry::strategy::buffer::point_circle circle_strategy(
        points_per_circle);
    boost::geometry::strategy::buffer::side_straight side_strategy;
    boost::geometry::model::multi_polygon<polygon> mpol;
    mpol.push_back(map_polygon);
    // Declare output
    boost::geometry::model::multi_polygon<polygon> result;
    // Create the buffer of a multi polygon
    boost::geometry::buffer(mpol, result, distance_strategy, side_strategy,
                            join_strategy, end_strategy, circle_strategy);

    if (result.size() == 0) {
      //ROS_ERROR("Border map wrong, using default border.");
      PWARN<<"Border map wrong, using default border.";
      SetDefaultMap(map_msg);
    } else {
      map_msg->polygon.points.resize(result[0].outer().size());
      pcl::PointCloud<pcl::PointXYZ> map_;
      map_.points.resize(result[0].outer().size());
      for (size_t i = 0; i < result[0].outer().size(); i++) {
        map_.points[i].x = result[0].outer()[i].y();
        map_.points[i].y = -result[0].outer()[i].x();
        map_.points[i].z = 0;
        map_msg->polygon.points[i].x = result[0].outer()[i].y();
        map_msg->polygon.points[i].y = -result[0].outer()[i].x();
        map_msg->polygon.points[i].z = 0;
      }
      map_hull_.swap(map_);
      map_hull_.header = ConvertROSHeader2PCLHeader(map_ptr->header);
    }
}
void LidarPreprocess::BorderLine2MapHull(
    plusgo_msgs::msg::BodyPointArray::ConstSharedPtr map_ptr,
    pcl::PointCloud<pcl::PointXYZ> &map_hull) {
  pcl::PointCloud<pcl::PointXYZ> map_;
  map_.points.resize(map_ptr->array.size());
  for (size_t i = 0; i < map_ptr->array.size(); i++) {
    map_.points[i].x = map_ptr->array[i].y;
    map_.points[i].y = -map_ptr->array[i].x;
    map_.points[i].z = map_ptr->array[i].z;
  }
  map_hull.swap(map_);
}
}  // namespace lidar
}  // namespace perception
}  // namespace plusgo
