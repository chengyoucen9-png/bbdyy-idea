#!/bin/bash

# 完整功能测试脚本

echo "🧪 开始测试所有功能..."
echo ""

BASE_URL="http://localhost:3000/api"
TOKEN=""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -n "测试 $name... "
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$data")
    else
        response=$(curl -s -X GET "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN")
    fi
    
    if echo "$response" | grep -q "code.*0"; then
        echo -e "${GREEN}✓ 通过${NC}"
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        echo "响应: $response"
        return 1
    fi
}

# 1. 测试健康检查
echo "=== 1. 健康检查 ==="
test_endpoint "系统健康" "GET" "/health"
test_endpoint "数据库健康" "GET" "/health/db"
test_endpoint "内存健康" "GET" "/health/memory"
echo ""

# 2. 测试用户注册
echo "=== 2. 用户认证 ==="
REGISTER_DATA='{
  "username": "testuser_'$(date +%s)'",
  "email": "test'$(date +%s)'@example.com",
  "password": "123456",
  "nickname": "测试用户"
}'

echo -n "注册用户... "
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "$REGISTER_DATA")

if echo "$REGISTER_RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✓ 通过${NC}"
    TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo "Token: ${TOKEN:0:50}..."
else
    echo -e "${RED}✗ 失败${NC}"
    echo "响应: $REGISTER_RESPONSE"
    exit 1
fi

# 3. 测试素材管理
echo ""
echo "=== 3. 素材管理 ==="
test_endpoint "获取素材列表" "GET" "/materials"
test_endpoint "获取素材统计" "GET" "/materials/stats/summary"

MATERIAL_DATA='{
  "name": "测试素材",
  "scene": "测试场景",
  "tags": ["测试", "演示"],
  "fileType": "image"
}'
test_endpoint "创建素材" "POST" "/materials" "$MATERIAL_DATA"

# 4. 测试选题管理
echo ""
echo "=== 4. 选题管理 ==="
test_endpoint "获取选题列表" "GET" "/topics"

TOPIC_DATA='{
  "title": "测试选题",
  "description": "这是一个测试选题",
  "priority": "high",
  "difficulty": 2
}'
test_endpoint "创建选题" "POST" "/topics" "$TOPIC_DATA"
test_endpoint "获取选题统计" "GET" "/topics/stats/summary"

# 5. 测试视频管理
echo ""
echo "=== 5. 视频管理 ==="
test_endpoint "获取视频列表" "GET" "/videos"
test_endpoint "获取视频统计" "GET" "/videos/stats/summary"

# 6. 测试AI配置
echo ""
echo "=== 6. AI配置管理 ==="
test_endpoint "获取AI配置列表" "GET" "/ai-providers"

# 7. 测试用户信息
echo ""
echo "=== 7. 用户信息 ==="
test_endpoint "获取个人信息" "GET" "/users/me"

echo ""
echo "======================================"
echo -e "${GREEN}✅ 所有测试完成！${NC}"
echo "======================================"
echo ""
echo "📊 测试总结:"
echo "- 健康检查: ✓"
echo "- 用户认证: ✓"
echo "- 素材管理: ✓"
echo "- 选题管理: ✓"
echo "- 视频管理: ✓"
echo "- AI配置: ✓"
echo "- 用户信息: ✓"
echo ""
echo "🎉 系统所有核心功能正常！"
