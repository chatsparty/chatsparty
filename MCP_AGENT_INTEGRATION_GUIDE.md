# MCP Agent Integration Guide

## 🎯 **How MCP Connects to Agents**

Now MCP is **fully integrated** with your agents! Here's how it works:

## 🔄 **The Complete Flow**

### 1. **Setup Phase**
```
User creates MCP connection → Tests MCP server → Discovers available tools
```

### 2. **Agent Creation Phase**
```
User creates agent → Selects MCP connection → Chooses specific tools for agent
```

### 3. **Chat Phase**
```
User sends message → Agent uses MCP tools automatically → Returns enhanced response
```

## 🏗️ **Architecture Overview**

### **Agent owns MCP Tools**
- Each agent can be configured with specific MCP tools
- Agent's system prompt includes tool usage instructions
- Agent automatically suggests/uses tools when relevant

### **Enhanced Chat Service**
- Wraps existing chat service with MCP capabilities
- Works with **any LLM provider** (OpenAI, Anthropic, Ollama, etc.)
- Detects tool commands and executes them automatically

### **Intelligent Tool Execution**
- Agents can request tools in natural language
- System executes tools and feeds results back to agent
- Agent incorporates results into final response

## 💬 **How Agents Use MCP Tools**

### **Agent Training**
When an agent has MCP tools, its system prompt includes:
```
Available Tools: You have access to the following tools:
file_read, web_search, git_commit

To use a tool, respond with:
- "use tool file_read with {"path": "/path/to/file"}"
- "execute web_search({"query": "python tutorial"})"

You should suggest and use these tools when helpful.
```

### **Tool Execution Flow**
1. **User**: "Can you read the README file?"
2. **Agent**: "I'll read the README file for you. use tool file_read with {\"path\": \"README.md\"}"
3. **System**: Executes file_read tool, gets content
4. **Agent**: "Here's what I found in the README: [content summary]"

### **Automatic Tool Usage**
Agents can:
- **Suggest tools** when they would be helpful
- **Execute tools** automatically when needed
- **Chain tools** together for complex tasks
- **Explain results** in natural language

## 🔧 **Configuration Examples**

### **Example 1: File System Agent**
```json
{
  "name": "File Assistant",
  "connection_id": "mcp-filesystem-connection",
  "selected_mcp_tools": ["file_read", "file_write", "list_directory"],
  "characteristics": "Helps users manage files and directories"
}
```

**Chat Example:**
- **User**: "What files are in the current directory?"
- **Agent**: "use tool list_directory with {\"path\": \".\"}"
- **Result**: Shows file listing with descriptions

### **Example 2: Git Assistant**
```json
{
  "name": "Git Helper",
  "connection_id": "mcp-git-connection", 
  "selected_mcp_tools": ["git_status", "git_commit", "git_log"],
  "characteristics": "Helps with git repository management"
}
```

**Chat Example:**
- **User**: "Commit my changes"
- **Agent**: "I'll check the status first, then commit your changes."
- **Agent**: "use tool git_status with {}"
- **Agent**: "use tool git_commit with {\"message\": \"Update based on user changes\"}"

### **Example 3: Research Agent**
```json
{
  "name": "Research Assistant",
  "connection_id": "mcp-web-search-connection",
  "selected_mcp_tools": ["web_search", "url_fetch", "summarize"],
  "characteristics": "Conducts research and gathers information"
}
```

**Chat Example:**
- **User**: "Research the latest AI developments"
- **Agent**: "execute web_search({\"query\": \"latest AI developments 2024\"})"
- **Agent**: "execute summarize({\"content\": \"[search results]\"})"
- **Result**: Comprehensive research summary

## 🎛️ **Agent Configuration**

### **Database Schema**
```sql
-- Agents table now includes:
selected_mcp_tools JSONB,    -- ["tool1", "tool2", "tool3"]
mcp_tool_config JSONB        -- {"tool1": {"param": "value"}}
```

### **Frontend Integration**
The agent creation form now includes:
- **MCP Connection Selection**: Choose which MCP server to use
- **Tool Selection**: Pick specific tools for this agent
- **Tool Configuration**: Set parameters for each tool

### **API Updates**
```javascript
// Creating an agent with MCP tools
const agent = await api.post('/agents', {
  name: "File Assistant",
  connection_id: "mcp-file-server",
  selected_mcp_tools: ["file_read", "file_write"],
  mcp_tool_config: {
    "file_read": {"max_size": "1MB"},
    "file_write": {"backup": true}
  }
});
```

## 🚀 **Benefits of This Architecture**

### **1. Any LLM + MCP Tools**
- Use GPT-4 with local file tools
- Use Claude with web search tools  
- Use Ollama with git tools
- **No vendor lock-in**

### **2. Intelligent Tool Usage**
- Agents know when to use tools
- Natural language tool requests
- Contextual tool suggestions
- Error handling and retries

### **3. Granular Control**
- Each agent has specific tools
- Tool permissions per agent
- Configuration per tool
- Usage monitoring

### **4. Seamless Experience**
- Users don't manage tools directly
- Agents handle tool complexity
- Natural conversation flow
- Transparent tool execution

## 🔍 **Debugging & Monitoring**

### **Tool Execution Logs**
```
[Agent: File Assistant] Detected tool request: file_read
[MCP Client] Executing tool_read with {"path": "README.md"}
[MCP Server] Tool executed successfully, 1.2KB returned
[Agent: File Assistant] Incorporating tool results into response
```

### **Error Handling**
```
[Agent: Web Assistant] Tool web_search failed: Rate limit exceeded
[Agent: Web Assistant] Fallback: Using cached search results
[Agent: Web Assistant] Response: "I found some recent cached results..."
```

## 🎯 **Use Cases**

### **Development Assistant**
- **Tools**: file_read, file_write, git_commit, test_run
- **Capabilities**: Code review, file editing, git management, testing
- **Example**: "Review this PR and run the tests"

### **Content Manager**
- **Tools**: web_search, url_fetch, text_summarize, file_write
- **Capabilities**: Research, content creation, file management
- **Example**: "Research and write an article about AI trends"

### **System Administrator**
- **Tools**: system_info, process_list, log_read, service_restart
- **Capabilities**: System monitoring, troubleshooting, management
- **Example**: "Check system health and restart failed services"

### **Data Analyst**
- **Tools**: csv_read, data_analyze, chart_create, report_generate
- **Capabilities**: Data processing, analysis, visualization
- **Example**: "Analyze this CSV and create a summary report"

## 🔮 **What's Next**

With this architecture, you can now:

1. **Create Specialized Agents**: Each with specific tool capabilities
2. **Scale Tool Usage**: Add new MCP servers without code changes
3. **Monitor Tool Performance**: Track which tools are most useful
4. **Build Workflows**: Chain agents with different tool sets
5. **Customize Experiences**: Fine-tune tool permissions per agent

The MCP integration is now **complete and production-ready**! 🎉

Your agents can now leverage the full power of the MCP ecosystem while maintaining the clean, scalable architecture you already have.