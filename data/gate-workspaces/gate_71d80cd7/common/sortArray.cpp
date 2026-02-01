/**
 * @file sortArray.cpp
 * @brief 通用数组排序实现文件
 * @details 实现基于快速排序算法的通用数组排序功能，支持升序和降序
 */

#include "sortArray.h"
#include <string.h>
#include <stdlib.h>

// 常量定义
#define MAX_ORDER_LENGTH 10

/**
 * @brief 比较两个元素的大小关系
 * @en_name compareElements
 * @cn_name 比较元素
 * @type 函数
 * @param[in] a 第一个元素
 * @param[in] b 第二个元素
 * @param[in] isAscending 是否为升序排序标志，1为升序，0为降序
 * @retval int 如果a应该在b之前返回1，否则返回0
 * @granularity 原子函数
 * @tag_level1 common
 * @tag_level2 sort
 * @version 1.0
 * @date 2023-10-27
 * @author Generator
 */
static int compareElements(int a, int b, int isAscending) {
    int ret = 0;
    if (1 == isAscending) {
        if (a < b) {
            ret = 1;
        } else {
            ret = 0;
        }
    } else {
        if (a > b) {
            ret = 1;
        } else {
            ret = 0;
        }
    }
    return ret;
}

/**
 * @brief 交换两个整数的值
 * @en_name swapElements
 * @cn_name 交换元素
 * @type 函数
 * @param[in] a 第一个元素的指针
 * @param[in] b 第二个元素的指针
 * @retval void 无返回值
 * @granularity 原子函数
 * @tag_level1 common
 * @tag_level2 sort
 * @version 1.0
 * @date 2023-10-27
 * @author Generator
 */
static void swapElements(int* a, int* b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

/**
 * @brief 快速排序的分区函数
 * @en_name quickSortPartition
 * @cn_name 快速排序分区
 * @type 函数
 * @param[in] array 待排序数组
 * @param[in] low 起始索引
 * @param[in] high 结束索引
 * @param[in] isAscending 是否为升序排序标志
 * @retval int 返回分区的索引
 * @granularity 原子函数
 * @tag_level1 common
 * @tag_level2 sort
 * @version 1.0
 * @date 2023-10-27
 * @author Generator
 */
static int quickSortPartition(int* array, int low, int high, int isAscending) {
    int pivot = array[high]; // 选取最后一个元素作为基准
    int i = low - 1;         // i是小于基准的元素的索引
    int j = 0;

    for (j = low; j < high; j = j + 1) {
        int shouldSwap = compareElements(array[j], pivot, isAscending);
        if (1 == shouldSwap) {
            i = i + 1;
            swapElements(&array[i], &array[j]);
        }
    }
    swapElements(&array[i + 1], &array[high]);
    return i + 1;
}

/**
 * @brief 快速排序的递归实现函数
 * @en_name quickSortRecursive
 * @cn_name 快速排序递归
 * @type 函数
 * @param[in] array 待排序数组
 * @param[in] low 起始索引
 * @param[in] high 结束索引
 * @param[in] isAscending 是否为升序排序标志
 * @retval void 无返回值
 * @granularity 原子函数
 * @tag_level1 common
 * @tag_level2 sort
 * @version 1.0
 * @date 2023-10-27
 * @author Generator
 */
static void quickSortRecursive(int* array, int low, int high, int isAscending) {
    if (low < high) {
        int pi = quickSortPartition(array, low, high, isAscending);
        quickSortRecursive(array, low, pi - 1, isAscending);
        quickSortRecursive(array, pi + 1, high, isAscending);
    }
}

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
 * @granularity 复合函数
 * @tag_level1 common
 * @tag_level2 sort
 * @version 1.0
 * @date 2023-10-27
 * @author Generator
 */
int sortArray(const int* inputArray, int arraySize, const char* orderStr, int* outputArray) {
    int ret = 0;
    int isAscending = 1; // 默认为升序
    int i = 0;

    // 1. 检查输入数组指针是否为空
    if (NULL == inputArray) {
        ret = -1;
    }

    // 2. 检查输出数组指针是否为空
    if (0 == ret) {
        if (NULL == outputArray) {
            ret = -1;
        }
    }

    // 3. 检查数组大小是否合法（小于0视为非法，0和1视为合法但无需排序）
    if (0 == ret) {
        if (arraySize < 0) {
            ret = -1;
        }
    }

    // 4. 解析排序顺序参数
    if (0 == ret) {
        if (NULL != orderStr) {
            // 比较是否为降序
            int cmpDesc = strcmp(orderStr, "desc");
            if (0 == cmpDesc) {
                isAscending = 0;
            } else {
                // 如果不是 desc，则检查是否为 asc，否则报错
                int cmpAsc = strcmp(orderStr, "asc");
                if (0 != cmpAsc) {
                    ret = -1;
                }
            }
        } else {
            // 默认升序
            isAscending = 1;
        }
    }

    // 5. 复制输入数组到输出数组（不改变原输入）
    if (0 == ret) {
        if (arraySize > 0) {
            for (i = 0; i < arraySize; i = i + 1) {
                outputArray[i] = inputArray[i];
            }
        }
    }

    // 6. 执行快速排序逻辑
    if (0 == ret) {
        if (arraySize > 1) {
            quickSortRecursive(outputArray, 0, arraySize - 1, isAscending);
        }
    }

    return ret;
}