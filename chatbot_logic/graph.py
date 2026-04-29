from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from dotenv import load_dotenv
from langchain_community.tools import ArxivQueryRun, WikipediaQueryRun
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_community.utilities import ArxivAPIWrapper, WikipediaAPIWrapper
from langchain_core.messages import AIMessage, AnyMessage, HumanMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from typing_extensions import Annotated, TypedDict


class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]


@dataclass(frozen=True)
class BotConfig:
    model: str = "qwen/qwen3-32b"
    arxiv_top_k_results: int = 2
    wiki_top_k_results: int = 2
    tool_doc_chars_max: int = 500


def build_graph(config: Optional[BotConfig] = None):
    config = config or BotConfig()

    load_dotenv()

    arxiv = ArxivQueryRun(
        api_wrapper=ArxivAPIWrapper(
            top_k_results=config.arxiv_top_k_results,
            doc_content_chars_max=config.tool_doc_chars_max,
        ),
        description="Query arxiv papers",
    )
    wiki = WikipediaQueryRun(
        api_wrapper=WikipediaAPIWrapper(
            top_k_results=config.wiki_top_k_results,
            doc_content_chars_max=config.tool_doc_chars_max,
        )
    )
    tavily = TavilySearchResults()
    tools = [arxiv, wiki, tavily]

    llm = ChatGroq(model=config.model)
    llm_with_tools = llm.bind_tools(tools=tools)

    def tool_calling_llm(state: State):
        return {"messages": [llm_with_tools.invoke(state["messages"])]}

    builder = StateGraph(State)
    builder.add_node("tool_calling_llm", tool_calling_llm)
    builder.add_node("tools", ToolNode(tools))
    builder.add_edge(START, "tool_calling_llm")
    builder.add_conditional_edges("tool_calling_llm", tools_condition)
    builder.add_edge("tools", "tool_calling_llm")

    return builder.compile()


def invoke_once(
    user_text: str,
    history: Optional[List[AnyMessage]] = None,
    *,
    config: Optional[BotConfig] = None,
):
    graph = build_graph(config=config)
    messages_in: list[AnyMessage] = list(history or [])
    messages_in.append(HumanMessage(content=user_text))

    result = graph.invoke({"messages": messages_in})
    messages_out: list[AnyMessage] = result["messages"]

    last_ai = next((m for m in reversed(messages_out) if isinstance(m, AIMessage)), None)
    answer = last_ai.content if last_ai is not None else ""
    return answer, messages_out
