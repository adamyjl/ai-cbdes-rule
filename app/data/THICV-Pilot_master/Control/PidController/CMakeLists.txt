cmake_minimum_required(VERSION 3.16.1)
project(main)
find_package(Eigen3 REQUIRED)
# find_package(zmq)
include_directories(
    ./include
    ./proto
    ${EIGEN3_INCLUDE_DIRS}
    ./include/yaml-cpp)
link_directories(
    lib)
file(GLOB_RECURSE SRCS_CPP 
    ./src/*.cpp 
    ./test/*.cpp)
add_executable(${PROJECT_NAME} ${SRCS_CPP})
set(LIBRARIES 
    pthread
    yaml-cpp
    zmq
    )
target_link_libraries(${PROJECT_NAME} ${LIBRARIES})

