import { ErrorBoundary, Facet, Paging, PagingInfo, Results, SearchBox, SearchProvider, WithSearch } from "@elastic/react-search-ui";
import { Layout, SingleLinksFacet } from "@elastic/react-search-ui-views";
import "@elastic/react-search-ui-views/lib/styles/styles.css";
import { SearchDriverOptions } from "@elastic/search-ui";
import ElasticsearchAPIConnector, { SearchRequest } from "@elastic/search-ui-elasticsearch-connector";
import moment from "moment";
import { Sport } from "./Sport";

const connector = new ElasticsearchAPIConnector(
  {
    host: "http://localhost:9200",
    index: "sports_4lab",
  },
  (requestBody, requestState, queryConfig): SearchRequest => {
    if (!requestState.searchTerm) return requestBody;

    if (requestState.searchTerm.startsWith("d=")) {
      requestBody.query = {
        match: {
          description: requestState.searchTerm.replace("d=", ""),
        },
      };
    } else if (requestState.searchTerm.startsWith("c=")) {
      requestBody.query = {
        match: {
          content: requestState.searchTerm.replace("c=", ""),
        },
      };
    } else if (requestState.searchTerm.startsWith("s=")) {
      requestBody.query = {
        match: {
          snippet: requestState.searchTerm.replace("s=", ""),
        },
      };
    } else {
      const searchFields = queryConfig.search_fields;

      requestBody.query = {
        multi_match: {
          query: `${requestState.searchTerm}`,
          fields: searchFields
            ? Object.keys(searchFields).map((fieldName): string => `${fieldName}^${searchFields[fieldName].weight || 1}`)
            : undefined,
          fuzziness: "AUTO",
          prefix_length: 2,
        },
      };
    }
    return requestBody;
  }
);

const config: SearchDriverOptions = {
  apiConnector: connector,
  debug: true,
  alwaysSearchOnInitialLoad: true,
  hasA11yNotifications: true,
  searchQuery: {
    search_fields: {
      title: {},
      sport_type: {},
    },
    result_fields: {
      title: {
        snippet: {
          size: 100,
          fallback: true,
        },
      },
      event_date: {},
      popularity: {},
      sport_type: {},
      description: {},
      content: {},
      snippet: {},
    },
    disjunctiveFacets: ["event_date"],
    facets: {
      title_keyword: { type: "value", size: 10 },
      popularity: {
        type: "range",
        ranges: [
          { from: 1, name: "❶ & More" },
          { from: 2, name: "❷ & More" },
          { from: 3, name: "❸ & More" },
          { from: 4, name: "❹ & More" },
          { from: 5, name: "❺ (Max)" },
        ],
      },
      event_date: {
        type: "range",
        ranges: [
          {
            from: moment().subtract(30, "years").toISOString(),
            name: "Within the last 30 years",
          },
          {
            from: moment().subtract(70, "years").toISOString(),
            to: moment().subtract(30, "years").toISOString(),
            name: "30 - 70 years ago",
          },
          {
            to: moment().subtract(70, "years").toISOString(),
            name: "More than 70 years ago",
          },
        ],
      },
    },
  },
  autocompleteQuery: {
    results: {
      resultsPerPage: 5,
      result_fields: {
        title: {
          snippet: {
            size: 100,
            fallback: true,
          },
        },
        event_date: {},
        popularity: {},
        sport_type: {},
      },
    },
  },
};

function App(): JSX.Element {
  const sport: Sport = {
    title: "",
    event_date: "",
    popularity: 0,
    sport_type: [],
    description: "",
    content: "",
    snippet: "",
  };

  return (
    <SearchProvider config={config}>
      <WithSearch mapContextToProps={({ results }) => ({ results })}>
        {({ results }): JSX.Element => {
          return (
            <div className="App">
              <ErrorBoundary>
                <Layout
                  header={
                    <SearchBox
                      autocompleteMinimumCharacters={3}
                      autocompleteResults={{
                        linkTarget: "_blank",
                        sectionTitle: "Results",
                        titleField: "title",
                        urlField: "any",
                        shouldTrackClickThrough: true,
                        clickThroughTags: ["test"],
                      }}
                      autocompleteSuggestions={true}
                      debounceLength={0}
                    />
                  }
                  sideContent={
                    <div>
                      <Facet field="popularity" label="Popularity (from 1 to 5)" view={SingleLinksFacet} />
                      <Facet field="event_date" label="Date" isFilterable={true} filterType="any" />
                      <div className="sui-facet">
                        <legend className="sui-facet__title">Add Sport</legend>
                        <div className="sui-facet-search">
                          <input
                            className="search__text-input"
                            type="date"
                            onChange={(e): string => (sport.event_date = `${e.target.value}`)}
                          />
                          <input
                            className="search__text-input"
                            type="text"
                            placeholder="Title"
                            onChange={(e): string => (sport.title = e.target.value)}
                          />
                          <input
                            className="search__text-input"
                            type="text"
                            placeholder="Sport Type"
                            onChange={(e): string[] => (sport.sport_type = e.target.value.split(", "))}
                          />
                          <input
                            className="search__text-input"
                            type="text"
                            placeholder="Description"
                            onChange={(e) => (sport.description = e.target.value)}
                          />
                          <input
                            className="search__text-input"
                            type="text"
                            placeholder="Content"
                            onChange={(e) => (sport.content = e.target.value)}
                          />
                          <input
                            className="search__text-input"
                            type="text"
                            placeholder="Snippet"
                            onChange={(e) => (sport.snippet = e.target.value)}
                          />
                          <input
                            className="search__text-input"
                            type="number"
                            max="5"
                            min="0"
                            placeholder="Rate"
                            onChange={(e): number => (sport.popularity = Number(e.target.value))}
                          />
                          <button
                            onClick={async (): Promise<void> => {
                              await fetch("http://localhost:9200/sports_4lab/_doc", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ ...sport }),
                              });
                              window.location.reload();
                            }}>
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                  bodyContent={
                    <Results
                      titleField="title"
                      resultView={({ result }): JSX.Element => (
                        <li className="sui-result">
                          <div className="sui-result__header">
                            <h3>
                              <a
                                dangerouslySetInnerHTML={{
                                  __html: result.title?.raw || "No title",
                                }}
                                target="_blank"
                              />
                            </h3>
                          </div>
                          <div className="sui-result__body">
                            <div className="sui-result__details text-custom">
                              <div>
                                {result.event_date?.raw || "No date"}
                                <br />
                                {"Popularity Score: "}
                                {result.popularity?.raw || "N/A"}
                                <br />
                                {result.sport_type?.raw?.join(", ") || "No sport type"}
                                <br />
                                {`Description: ${result.description?.raw || "No description"}`}
                                <br />
                                {`Content: ${result.content?.raw || "No content"}`}
                                <br />
                                {`Snippet: ${result.snippet?.raw || "No snippet"}`}
                                <br />
                                <button
                                  onClick={async (): Promise<void> => {
                                    if (result.id?.raw) {
                                      await fetch(`http://localhost:9200/sports_4lab/_doc/${result.id.raw}`, {
                                        method: "DELETE",
                                      });
                                      window.location.reload();
                                    }
                                  }}>
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      )}
                      shouldTrackClickThrough={true}
                    />
                  }
                  bodyHeader={<PagingInfo />}
                  bodyFooter={<Paging />}
                />
              </ErrorBoundary>
            </div>
          );
        }}
      </WithSearch>
    </SearchProvider>
  );
}

export default App;
