/**
 * @file testSortArray.cpp
 * @brief 数组排序功能的单元测试文件
 */

#include "../common/sortArray.h"
#include <stdio.h>
#include <stdlib.h>

#define TEST_ARRAY_SIZE 10

/**
 * @brief 打印数组内容
 * @en_name printArray
 * @cn_name 打印数组
 * @type 函数
 * @param[in] array 数组指针
 * @param[in] size 数组大小
 * @retval void 无返回值
 * @granularity 原子函数
 * @tag_level1 test
 * @tag_level2 sort
 * @version 1.0
 * @date 2023-10-27
 * @author Generator
 */
static void printArray(const int* array, int size) {
    int i = 0;
    printf("[");
    for (i = 0; i < size; i = i + 1) {
        printf("%d", array[i]);
        if (i < size - 1) {
            printf(", ");
        }
    }
    printf("]\n");
}

/**
 * @brief 测试排序功能的主函数
 * @en_name testSortArray
 * @cn_name 测试数组排序
 * @type 函数
 * @param void 无参数
 * @retval int 返回0表示测试通过
 * @granularity 复合函数
 * @tag_level1 test
 * @tag_level2 sort
 * @version 1.0
 * @date 2023-10-27
 * @author Generator
 */
int main() {
    int ret = 0;
    
    // 1. 测试用例：升序排序
    printf("Test Case 1: Ascending Sort\n");
    int input1[TEST_ARRAY_SIZE] = {5, 2, 9, 1, 5, 6, 0, 3, 8, 7};
    int output1[TEST_ARRAY_SIZE] = {0};
    int size1 = TEST_ARRAY_SIZE;
    
    printf("Input: ");
    printArray(input1, size1);
    
    ret = sortArray(input1, size1, "asc", output1);
    
    if (0 == ret) {
        printf("Output: ");
        printArray(output1, size1);
    } else {
        printf("Sort failed with error code: %d\n", ret);
    }

    // 2. 测试用例：降序排序
    printf("\nTest Case 2: Descending Sort\n");
    int input2[TEST_ARRAY_SIZE] = {5, 2, 9, 1, 5, 6, 0, 3, 8, 7};
    int output2[TEST_ARRAY_SIZE] = {0};
    int size2 = TEST_ARRAY_SIZE;
    
    printf("Input: ");
    printArray(input2, size2);
    
    ret = sortArray(input2, size2, "desc", output2);
    
    if (0 == ret) {
        printf("Output: ");
        printArray(output2, size2);
    } else {
        printf("Sort failed with error code: %d\n", ret);
    }

    // 3. 测试用例：空数组
    printf("\nTest Case 3: Empty Array\n");
    int* input3 = NULL;
    int output3[1] = {0};
    int size3 = 0;
    
    printf("Input: Empty\n");
    
    ret = sortArray(input3, size3, "asc", output3);
    
    if (0 == ret) {
        printf("Output: Empty\n");
    } else {
        printf("Sort handled empty array (expected).\n");
    }

    // 4. 测试用例：单元素数组
    printf("\nTest Case 4: Single Element Array\n");
    int input4[1] = {42};
    int output4[1] = {0};
    int size4 = 1;
    
    printf("Input: ");
    printArray(input4, size4);
    
    ret = sortArray(input4, size4, "asc", output4);
    
    if (0 == ret) {
        printf("Output: ");
        printArray(output4, size4);
    } else {
        printf("Sort failed with error code: %d\n", ret);
    }

    // 5. 测试用例：非法排序参数
    printf("\nTest Case 5: Invalid Order Parameter\n");
    int input5[3] = {1, 2, 3};
    int output5[3] = {0};
    int size5 = 3;
    
    printf("Input: ");
    printArray(input5, size5);
    
    ret = sortArray(input5, size5, "invalid", output5);
    
    if (-1 == ret) {
        printf("Correctly detected invalid order parameter.\n");
    } else {
        printf("Failed to detect invalid order parameter.\n");
    }

    return 0;
}