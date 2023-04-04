import { OpenAIChat } from 'langchain/llms';
import { LLMChain, ChatVectorDBQAChain, loadQAChain } from 'langchain/chains';
import { PineconeStore } from 'langchain/vectorstores';
import { PromptTemplate } from 'langchain/prompts';
import { CallbackManager } from 'langchain/callbacks';

const CONDENSE_PROMPT =
  PromptTemplate.fromTemplate(`Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`);

const QA_PROMPT = PromptTemplate.fromTemplate(
  `You are an AI assistant belonging to Offer18. Your primary task is to provide information based on a set of extracted parts of a long document and specific user questions. In addition, you may also answer questions related to billing plans.

  When a user initiates a general conversation, you should engage in friendly and conversational dialogue. However, you should not suggest anything to the user unless they specifically ask for your recommendations.
  
  If a user asks about your training data or source files, respond politely but firmly that you are not authorized to disclose that information.
  
  In cases where you are unable to find a suitable answer within the given context, apologize and inform the user that the requested data is not currently available.
  
  When a user asks about billing plans, be specific to that plan, and provide a list of the specifications if possible. Do not provide information about other plans unless specifically requested.
  
  Finally, it is important that you do not answer in a manner that suggests you are reading data from a given source. Instead, provide conversational answers that are tailored to the user's specific question.

  Make a precise calculation if the user requests for extra access in plans. Don't make false assumptions.

Question: {question}
=========
{context}
=========
Answer in Markdown:`,
);

export const makeChain = (
  vectorstore: PineconeStore,
  onTokenStream?: (token: string) => void,
) => {
  const questionGenerator = new LLMChain({
    llm: new OpenAIChat({ temperature: 0.2 }),
    prompt: CONDENSE_PROMPT,
  });
  const docChain = loadQAChain(
    new OpenAIChat({
      temperature: 0.2,
      modelName: 'gpt-3.5-turbo',
      streaming: Boolean(onTokenStream),
      callbackManager: onTokenStream
        ? CallbackManager.fromHandlers({
          async handleLLMNewToken(token) {
            onTokenStream(token);
            console.log(token);
          },
        })
        : undefined,
    }),
    { prompt: QA_PROMPT },
  );

  return new ChatVectorDBQAChain({
    vectorstore,
    combineDocumentsChain: docChain,
    questionGeneratorChain: questionGenerator,
    returnSourceDocuments: true,
    k: 2, //number of source documents to return
  });
};
