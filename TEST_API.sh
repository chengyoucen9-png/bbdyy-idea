#!/bin/bash

# API 测试脚本

BASE_URL="http://localhost:3000/api"
echo "🧪 开始测试 API..."
echo "Base URL: $BASE_URL"
echo ""

# 1. 测试注册
echo "1️⃣ 测试用户注册..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "123456",
    "nickname": "测试用户"
  }')

echo "注册响应: $REGISTER_RESPONSE"
echo ""

# 2. 测试登录
echo "2️⃣ 测试用户登录..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "123456"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
echo "登录成功! Token: ${TOKEN:0:50}..."
echo ""

# 3. 测试获取用户信息
echo "3️⃣ 测试获取用户信息..."
curl -s -X GET $BASE_URL/auth/profile \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# 4. 测试创建素材
echo "4️⃣ 测试创建素材..."
curl -s -X POST $BASE_URL/materials \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试素材1",
    "scene": "测试场景描述",
    "tags": ["测试", "演示"],
    "duration": "15秒",
    "note": "这是一个测试素材"
  }' | jq
echo ""

# 5. 测试获取素材列表
echo "5️⃣ 测试获取素材列表..."
curl -s -X GET "$BASE_URL/materials?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# 6. 测试创建选题
echo "6️⃣ 测试创建选题..."
curl -s -X POST $BASE_URL/topics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试选题",
    "description": "这是一个测试选题",
    "source": "手动添加",
    "priority": "high",
    "difficulty": 2
  }' | jq
echo ""

# 7. 测试获取选题列表
echo "7️⃣ 测试获取选题列表..."
curl -s -X GET $BASE_URL/topics \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

echo "✅ 测试完成!"
echo ""
echo "💡 提示:"
echo "- 如果看到数据返回，说明API工作正常"
echo "- 如果返回401错误，检查Token是否有效"
echo "- 如果返回500错误，检查数据库连接"

