"use client"

import React from "react"
import { motion } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { TrendingUp } from "lucide-react"

const projectData = [
  { month: "10月", completed: 8, inProgress: 12, pending: 4 },
  { month: "11月", completed: 12, inProgress: 8, pending: 6 },
  { month: "12月", completed: 15, inProgress: 10, pending: 3 },
  { month: "1月", completed: 18, inProgress: 14, pending: 5 }
]

const statusData = [
  { name: "完了", value: 53, color: "#10B981" },
  { name: "進行中", value: 44, color: "#0066CC" },
  { name: "保留", value: 18, color: "#F59E0B" },
  { name: "キャンセル", value: 8, color: "#EF4444" }
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700">{entry.name}: {entry.value}件</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function ProjectChart() {
  return (
    <Card className="hover-lift border-engineering-blue/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-engineering-blue" />
          プロジェクト推移
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">月別プロジェクト数</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickLine={{ stroke: '#D1D5DB' }}
                  />
                  <YAxis
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickLine={{ stroke: '#D1D5DB' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="completed"
                    fill="#10B981"
                    name="完了"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="inProgress"
                    fill="#0066CC"
                    name="進行中"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="pending"
                    fill="#F59E0B"
                    name="保留"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">ステータス分布</h4>
            <div className="h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: data.color }}
                              />
                              <span className="font-medium">{data.name}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {data.value}件 ({((data.value / statusData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                <div className="flex flex-wrap justify-center gap-2">
                  {statusData.map((entry, index) => (
                    <motion.div
                      key={entry.name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-1 text-xs"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-gray-600">{entry.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 bg-gradient-engineering-subtle rounded-lg"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-engineering-blue">123</p>
              <p className="text-xs text-gray-600">総プロジェクト数</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">89%</p>
              <p className="text-xs text-gray-600">成功率</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">15.2日</p>
              <p className="text-xs text-gray-600">平均完了日数</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">4.7</p>
              <p className="text-xs text-gray-600">平均評価</p>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  )
}