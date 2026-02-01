
cmake_minimum_required(VERSION 3.16.1)
project(main)   #project为模块名称，与模块目录名一致，在自动生成工具不具备的情况下，工程名要修改
#以下内容中为加可修改注释的都是模板，不要修改或增加新的内容
include_directories(./include)
file(GLOB_RECURSE SRCS_CPP  ./src/*.cpp ./test/*.cpp)
# add_library(${PROJECT_NAME} SHARED ${SRCS_CPP})
add_executable(${PROJECT_NAME} ${SRCS_CPP})

