/**
 * @file sortArray.h
 * @brief 通用数组排序头文件
 */

#ifndef COMMON_SORT_ARRAY_H
#define COMMON_SORT_ARRAY_H

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief 对数组进行快速排序
 * @en_name sortArray
 * @cn_name 数组排序
 * @type 函数
 * @param[in] inputArray 输入数组指针
 * @param[in] arraySize 数组大小
 * @param[in] orderStr 排序顺序字符串，"asc"为升序，"desc"为降序
 * @param[out] outputArray 输出数组指针，需由调用方预先分配内存，大小与输入一致
 * @retval int 返回0表示成功，-1表示失败
 * @granularity 原子函数
 * @tag_level1 common
 * @tag_level2 sort
 * @version 1.0
 * @date 2023-10-27
 * @author Generator
 */
int sortArray(const int* inputArray, int arraySize, const char* orderStr, int* outputArray);

#ifdef __cplusplus
}
#endif

#endif // COMMON_SORT_ARRAY_H