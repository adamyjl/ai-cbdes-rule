cmake_minimum_required(VERSION 3.16.1)
project(Dijkstra)
find_package (OpenCV REQUIRED)
include_directories(
    ./include
    ${OpenCV_INCLUDE_DIRS})
file(GLOB_RECURSE SRCS_CPP 
    ./src/*.cpp 
    ./test/*.cpp)
add_executable(${PROJECT_NAME} ${SRCS_CPP})
target_link_libraries (${PROJECT_NAME} ${OpenCV_LIBS})
