cmake_minimum_required(VERSION 3.16.1)
project(main)
find_package(Eigen3 REQUIRED)
include_directories(
    ./include
    ./dependence
    ${EIGEN3_INCLUDE_DIRS})
file(GLOB_RECURSE SRCS_CPP 
    ./src/*.cpp 
    ./src/*.cc
    ./test/*.cpp)
add_executable(${PROJECT_NAME} ${SRCS_CPP})


