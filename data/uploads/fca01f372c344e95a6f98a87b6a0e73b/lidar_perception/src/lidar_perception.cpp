#include "lidar_perception/lidar_perception.h"

#include <omp.h>
#include <opencv2/core/cvdef.h>
#include <unistd.h>
#include <iostream>
#include "pcl/pcl_macros.h"
#include "pcl/impl/point_types.hpp"
// #include "ros/init.h"
// #include "ros/time.h"
#include "PLOG/log.h"


namespace plusgo {
namespace perception {
namespace lidar {
LidarPerception::LidarPerception(std::shared_ptr<rclcpp::Node> nh, std::shared_ptr<rclcpp::Node> pnh)
    : eucli_cluster_(new EuclideanCluster()),
    post_process_(new LidarPostprocessing()){
  std::string yaml_path = ament_index_cpp::get_package_share_directory("lidar_perception") + "/../../../../src/lidar_perception/params/lidar_perception.yaml";
  std::cout << "yaml_path: " << yaml_path << std::endl;
  YAML::Node config = YAML::LoadFile(yaml_path);
  indoor_ = config["Indoor"].as<int>();
  outdoor_ = config["Outdoor"].as<int>();
  in_to_out_ = config["In2Out"].as<int>();
  out_to_in_ = config["Out2In"].as<int>();
  case0_filterheight_ = config["Case0FilterHeight"].as<float>();
  case1_filterheight_ = config["Case1FilterHeight"].as<float>();
  params_perception_topic_ = config["ParamsSetting"].as<std::string>();
  no_ground_topic_ = config["NoGroundTopic"].as<std::string>();
  // subscrib params setting topic
  // params_setting_subscriber_ = nh->create_subscription<plusgo_msgs::msg::SystemInfoReport>(params_perception_topic_, 1, std::bind(&LidarPerception::ParamsSettingCallback, this, _1));
  params_setting_subscriber_ = nh->create_subscription<plusgo_msgs::msg::SystemInfoReport>(
    params_perception_topic_, 1, 
    [this](const plusgo_msgs::msg::SystemInfoReport::SharedPtr msg) {
        this->ParamsSettingCallback(msg);
    });
  // no_ground_subscriber_ = nh->create_subscription<sensor_msgs::msg::PointCloud2>(no_ground_topic_, 1, std::bind(&LidarPerception::NoGroundCallback, this, _1));
  no_ground_subscriber_ = nh->create_subscription<sensor_msgs::msg::PointCloud2>(
    no_ground_topic_, 1, 
    [this](const sensor_msgs::msg::PointCloud2::SharedPtr msg) {
        this->NoGroundCallback(msg);
    });
  objects_pcd_pub_ =  nh->create_publisher<sensor_msgs::msg::PointCloud2>("objects_pcd", 1);
}

//params
void LidarPerception::ParamsSettingCallback(plusgo_msgs::msg::SystemInfoReport::ConstSharedPtr msg){
    int is_slope_ = msg->slope_state;
    int in_where_ = msg->out_or_indoor;
    int special_case_ = msg->special_cases;
    int trun_or_goStraight_ = msg->map_mode_1;
   
    if(in_where_ == 0)
    { //outdoor
      MaxClusterSize = outdoor_;  
    }
    else if(in_where_ == 1)
    { //out2in
      MaxClusterSize = out_to_in_;
    }
    else if(in_where_ == 2)
    { //in2out
      MaxClusterSize = in_to_out_;
    }
    else if(in_where_ == 3)
    { //indoor
      MaxClusterSize = indoor_;
    }
    
    // case 1: C turn to D
    if(special_case_ == 1){
      FilterObstacleHeight = case1_filterheight_;
    }
    else if(special_case_ == 0){
      FilterObstacleHeight = case0_filterheight_;
    }
    // RCLCPP_INFO_STREAM(nh->get_logger(), "SpecialCase: "<< special_case_);
    // RCLCPP_INFO_STREAM(nh->get_logger(), "MaxClusterSize: "<< MaxClusterSize);
    // RCLCPP_INFO_STREAM(nh->get_logger(), "FilterObstacleHeight: "<< FilterObstacleHeight);
    PINFO<<"SpecialCase: "<< special_case_;
    PINFO<<"MaxClusterSize: "<< MaxClusterSize;
    PINFO<<"FilterObstacleHeight: "<< FilterObstacleHeight;
    PINFO<<"trun_or_goStraight: "<<trun_or_goStraight_;

}


void LidarPerception::NoGroundCallback(sensor_msgs::msg::PointCloud2::ConstSharedPtr cloud_ptr) {
  // get point cloud data, convert to pcl format
  pcl::PointCloud<pcl::PointXYZI>::Ptr cloud_original(new pcl::PointCloud<pcl::PointXYZI>);
  pcl::fromROSMsg(*cloud_ptr, *cloud_original);
  //ROS_DEBUG_STREAM("no_ground_points: " << cloud_original->points.size());
  
  // euclidean cluster
  vector<vector<int>> clustersIndex;
  eucli_cluster_->SetInputCloud(cloud_original);
  cloud_original = eucli_cluster_->GetVoxelClouds(); // leaf
  clustersIndex = eucli_cluster_->GetClustersIndex();
  
  //post process --> filter ground
  post_process_->FilterGroundObstacle(cloud_original, clustersIndex);
  clustersIndex = post_process_->GetFilteredObstacleIndex();
  // get clustering pointCloud
  vector<int> cluster_indices;
  cluster_indices = eucli_cluster_->GetMergedClustersIndex();
  //ROS_DEBUG_STREAM("cluster_points: " << cluster_indices.size());

  // set clusterID as  intensity for clusterPoints
  for(int  i = 0; i < cloud_original->points.size(); ++i){
    cloud_original->points[i].intensity = -1;
  }
  for (int i = 0; i < clustersIndex.size(); i++) { 
    for (const auto &index : clustersIndex[i]) {
      cloud_original->points[index].intensity = i;
    }
  }

  //publish objects point cloud
  pcl::PointCloud<pcl::PointXYZI>::Ptr cluster_points(new pcl::PointCloud<pcl::PointXYZI>);
  pcl::copyPointCloud(*cloud_original, cluster_indices, *cluster_points);
  sensor_msgs::msg::PointCloud2 objects_pcd_msg;
  pcl::toROSMsg(*cluster_points, objects_pcd_msg);
  objects_pcd_msg.header = cloud_ptr->header;
  objects_pcd_pub_->publish(objects_pcd_msg);
}
}  // namespace lidar
}  // namespace perception
}  // namespace plusgo
