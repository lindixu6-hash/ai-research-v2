// Vercel Serverless Function for /api/search
const express = require('express');
const cors = require('cors');

// 模拟 Express app
module.exports = async (req, res) => {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // 调用后端服务（需要单独部署后端）
    // 这里返回演示数据
    res.json({
      status: 'success',
      query,
      answer: {
        summary: '搜索功能正在部署中...',
        content: '后端 API 需要单独部署。请稍后再试。'
      },
      sources: []
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
