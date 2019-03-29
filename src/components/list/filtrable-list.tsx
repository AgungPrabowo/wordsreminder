import React from 'react'
import { FlatList } from 'react-native'
import memoize from 'memoize-one'
import { AddButton } from '@components/add-button'
import {
  STATUS_ERROR,
  STATUS_SUCCESS,
  STATUS_LOADING,
} from '@constants/statuses'
import { ErrorMessage } from '@components/error-message'
import { ActivityIndicator } from '@components/activity-indicator'
import { getErrorMessageFromFirestoreError } from '@utils/get-error-message-from-firestore-error'
import { Spacer } from '@components/spacer'
import { Text } from '@components/text'
import { MainView } from '@components/main-view'
import { ADD_BUTTON, EMPTY_LIST_MESSAGE } from '@e2e/ids'
import { FilterBar } from './filter-bar'
import {
  PARAM_SCREEN_TITLE,
  PARAM_HAS_FILTER_ENABLED,
} from '@constants/navigation-parameters'
import { isStringEmpty } from '@utils/is-string-empty'

type NavigationScreenProp = import('react-navigation').NavigationScreenProp<{}>
type NavigationScreenOptions = import('react-navigation').NavigationScreenOptions
type Query = import('react-native-firebase/firestore').Query
type DocumentSnapshot = import('react-native-firebase/firestore').DocumentSnapshot
type SnapshotError = import('react-native-firebase/firestore').SnapshotError
type ListRenderItem = import('react-native').ListRenderItem<any>
type Entity = import('@models/entity').Entity
type STATUS = import('@constants/statuses').STATUS
type QuerySnapshot = import('react-native-firebase/firestore').QuerySnapshot
type DocumentChange = import('react-native-firebase/firestore').DocumentChange

type Props = {
  query: Query
  onAddPress: () => void
  documentSnapshotToEntity: (doc: DocumentSnapshot) => Entity
  renderItem: ListRenderItem
  emptyListMessage: string
  filterEntities: (filter: string, entity: any) => boolean
  testID: string
  navigation: NavigationScreenProp
}

type State = typeof initialState

const initialState = Object.freeze({
  entities: [] as Entity[],
  filter: undefined as string | undefined,
  isRefreshing: false,
  status: STATUS_LOADING as STATUS,
  error: undefined as string | undefined,
})

class FiltrableList extends React.PureComponent<Props, State> {
  static navigationOptions = ({
    navigation,
  }: {
    navigation: NavigationScreenProp
  }): NavigationScreenOptions => {
    return {
      title: navigation.getParam(PARAM_SCREEN_TITLE),
    }
  }

  readonly state = initialState

  unsubscribe?: () => void

  query = this.props.query

  filterEntities = memoize((entities: Entity[], filter?: string) => {
    let filteredEntities = entities
    if (!isStringEmpty(filter)) {
      filteredEntities = entities.filter(entity =>
        this.props.filterEntities(filter!, entity)
      )
    }

    // Have to manually sort entities because chaining firestore().where().orderBy() throw an error.
    // https://github.com/invertase/react-native-firebase/issues/1437
    return filteredEntities.sort(this.compareUpdatedAt)
  })

  async componentDidMount() {
    this.unsubscribe = this.query.onSnapshot(
      this.onCollectionUpdate,
      this.onCollectionError
    )
    await this.refreshEntities()
  }

  componentWillUnmount() {
    if (this.unsubscribe !== undefined) {
      this.unsubscribe()
    }
  }

  compareUpdatedAt(e1: Entity, e2: Entity) {
    if (e2.updatedAt == null || e1.updatedAt == null) {
      return 0
    }
    return e2.updatedAt.getTime() - e1.updatedAt.getTime()
  }

  onCollectionUpdate = (querySnapshot: QuerySnapshot) => {
    let entities: Entity[] = Array.from(this.state.entities)
    querySnapshot.docChanges.forEach((docChange: DocumentChange) => {
      const entity = this.props.documentSnapshotToEntity(docChange.doc)
      switch (docChange.type) {
        case 'added':
          entities.push(entity)
          break
        case 'removed':
          entities = entities.filter(e => e.id !== entity.id)
          break
        case 'modified':
          entities = entities.map(e => {
            if (e.id === entity.id) {
              return entity
            }

            return e
          })
          break
        default:
      }
    })

    this.setState({
      entities,
    })
  }

  onCollectionError = (error: SnapshotError) => {
    const errorMessage = getErrorMessageFromFirestoreError(error)
    this.setState({
      status: STATUS_ERROR as STATUS,
      error: errorMessage,
    })
  }

  async refreshEntities() {
    try {
      const snap = await this.query.get()
      this.setState({
        entities: snap.docs
          .map(doc => this.props.documentSnapshotToEntity(doc))
          .sort(this.compareUpdatedAt),
        status: STATUS_SUCCESS,
      })
    } catch (error) {
      this.setState({
        status: STATUS_ERROR,
        error: getErrorMessageFromFirestoreError(error),
      })
    }
  }

  keyExtractor = (entity: Entity): string => entity.id!

  handleRefresh = () => {
    this.setState(
      {
        isRefreshing: true,
      },
      async () => {
        await this.refreshEntities()
        this.setState({
          isRefreshing: false,
        })
      }
    )
  }

  handleFilterChange = (filter: string) => {
    this.setState({
      filter,
    })
  }

  handleCloseFilterPress = () => {
    this.props.navigation.setParams({ [PARAM_HAS_FILTER_ENABLED]: false })
    this.setState({
      filter: undefined,
    })
  }

  renderContent = () => {
    const { status } = this.state

    if (status === STATUS_LOADING) {
      return <ActivityIndicator />
    }

    if (status === STATUS_ERROR) {
      return <ErrorMessage message={this.state.error!} />
    }

    const entities = this.filterEntities(this.state.entities, this.state.filter)
    if (entities.length === 0) {
      return (
        <Spacer marginTop={10} marginLeft={10} marginRight={10}>
          <Text testID={EMPTY_LIST_MESSAGE} color="primary025" fontSize={20}>
            {this.props.emptyListMessage}
          </Text>
        </Spacer>
      )
    }

    return (
      <FlatList
        data={entities}
        renderItem={this.props.renderItem}
        keyExtractor={this.keyExtractor}
        refreshing={this.state.isRefreshing}
        onRefresh={this.handleRefresh}
        keyboardShouldPersistTaps="handled"
      />
    )
  }

  render() {
    const hasFilterEnabled = this.props.navigation.getParam(
      PARAM_HAS_FILTER_ENABLED
    )
    return (
      <MainView testID={this.props.testID}>
        {hasFilterEnabled && (
          <FilterBar
            onCloseFilterPress={this.handleCloseFilterPress}
            onFilterChange={this.handleFilterChange}
          />
        )}
        {this.renderContent()}
        <AddButton
          onPress={this.props.onAddPress}
          testID={ADD_BUTTON(this.props.testID)}
        />
      </MainView>
    )
  }
}

export { FiltrableList }
