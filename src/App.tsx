import { ErrorBoundary, Facet, SearchBox, SearchProvider, WithSearch, Results } from "@elastic/react-search-ui";
import { Layout, Paging, PagingInfo, SingleLinksFacet } from "@elastic/react-search-ui-views";
import { SearchDriverOptions } from "@elastic/search-ui";
import ElasticsearchAPIConnector, { SearchRequest } from "@elastic/search-ui-elasticsearch-connector";
import moment from "moment";
// import "./App.css";
import { Sport } from "./Sport";

const connector = new ElasticsearchAPIConnector(
  {
    host: "http://localhost:9200",
    index: "sports",
  },
  (requestBody, requestState, queryConfig): SearchRequest => {
    if (!requestState.searchTerm) return requestBody;

    const searchFields = queryConfig.search_fields;

    requestBody.query = {
      multi_match: {
        query: `${requestState.searchTerm}`,
        fields: searchFields
          ? Object.keys(searchFields).map((fieldName) => `${fieldName}^${searchFields[fieldName].weight || 1}`)
          : undefined,
        fuzziness: "AUTO",
        prefix_length: 2,
      },
    };
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
    },
    disjunctiveFacets: ["event_date"],
    facets: {
      title_keyword: { type: "value", size: 10 },
      popularity: {
        type: "range",
        ranges: [
          { from: 1, name: "★☆☆☆☆ & Up" },
          { from: 2, name: "★★☆☆☆ & Up" },
          { from: 3, name: "★★★☆☆ & Up" },
          { from: 4, name: "★★★★☆ & Up" },
          { from: 5, name: "★★★★★" },
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
            from: moment().subtract(30, "years").toISOString(),
            to: moment().subtract(70, "years").toISOString(),
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
  };

  return (
    <SearchProvider config={config}>
      <WithSearch
        mapContextToProps={({ result, setPage }) => ({
          result,
          setPage,
        })}>
        {({ setPage }): JSX.Element => {
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
                      <Facet field="popularity" label="Popularity" view={SingleLinksFacet} />
                      <Facet field="event_date" label="Date" isFilterable={true} filterType="any" />
                      <div className="sui-facet">
                        <legend className="sui-facet__title">Add Sport</legend>
                        <div className="sui-facet-search">
                          <input
                            className="sui-facet-search__text-input"
                            type="date"
                            onChange={(evt): string => (sport.event_date = `${evt.target.value}`)}
                          />
                          <input
                            className="sui-facet-search__text-input"
                            type="text"
                            placeholder="Title"
                            onChange={(evt): string => (sport.title = evt.target.value)}
                          />
                          <input
                            className="sui-facet-search__text-input"
                            type="text"
                            placeholder="Sport Type"
                            onChange={(evt): string[] => (sport.sport_type = evt.target.value.split(", "))}
                          />
                          <input
                            className="sui-facet-search__text-input"
                            type="number"
                            max="5"
                            min="0"
                            placeholder="Rate"
                            onChange={(evt): number => (sport.popularity = Number(evt.target.value))}
                          />
                          <button
                            onClick={async (): Promise<void> => {
                              await fetch("http://localhost:9200/sports/_doc", {
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
                                  __html: result.title.raw,
                                }}
                                target="_blank"
                              />
                            </h3>
                          </div>
                          <div className="sui-result__body">
                            <div className="sui-result__details">
                              <div>
                                {result.event_date.raw}
                                <br />
                                {"Popularity Score: "}
                                {result.popularity.raw}
                                <br />
                                {result.sport_type.raw.join(", ")}
                                <br />
                                <button
                                  onClick={async (): Promise<void> => {
                                    await fetch("http://localhost:9200/sports/_doc/" + result.id.raw, {
                                      method: "DELETE",
                                    });
                                    window.location.reload();
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
                  bodyHeader={<PagingInfo start={1} end={1} searchTerm={""} totalResults={1} />}
                  bodyFooter={<Paging totalPages={1} onChange={setPage} />}
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
