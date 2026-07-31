import AudioProvider from "@/audio/AudioManager";
import { AudioPost, ITEM_HEIGHT } from "@/components/AudioPost";
import { usePostContext } from "@/components/PostProvider";
import { Header } from "@/components/ui/Header";
import { Post } from "@/service/posts";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  ViewabilityConfig,
  ViewabilityConfigCallbackPair,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Feed() {
  const { posts, isLoading, error } = usePostContext();

  //track the current item in order to determine scroll enabling
  const [currentItem, setCurrentItem] = useState<Post["id"]>(0);

  const viewabilityConfigCallback = useRef<
    ViewabilityConfigCallbackPair["onViewableItemsChanged"]
  >(({ changed }) => {
    console.log("Changed: ", changed);
    changed.forEach((item) => {
      //clear the audio player when the post moves out of view
      //TODO: reset the ui for that player that is not visible anymore
      item.isViewable === false && AudioProvider.clearActivePlayer();
      item.isViewable === true && setCurrentItem((item.item as Post).id);
    });
  });

  const viewabilityConfig: ViewabilityConfig = {
    itemVisiblePercentThreshold: 50, // Item is considered viewable if 50% is visible
  };

  const currentPost = useMemo(
    () => posts && posts.find((item) => item.id === currentItem),
    [posts, currentItem],
  );

  const shouldScrollEnable = useMemo(
    () => (posts ? currentPost?.like !== undefined : false),
    [posts, currentPost],
  );

  console.log(currentItem, currentPost);
  console.log("shouldScrollEnable", shouldScrollEnable);

  return (
    <SafeAreaView
      edges={{ top: "additive", bottom: "off" }}
      style={{ flex: 1, padding: 20 }}
    >
      {error && (
        <Text style={{ fontSize: 44, color: "white", textAlign: "center" }}>
          {error?.message}
        </Text>
      )}
      {!isLoading && !error && posts && (
        <FlatList
          invertStickyHeaders={isLoading}
          ListHeaderComponent={
            isLoading ? (
              <View style={styles.horizontal}>
                <ActivityIndicator size="large" color="#0000ff" />
              </View>
            ) : (
              <Header text={"Your band sucks!"} />
            )
          }
          stickyHeaderIndices={[0]}
          data={posts}
          keyExtractor={(post) => post.id.toString()}
          renderItem={({ item }) => <AudioPost {...item} />}
          onViewableItemsChanged={viewabilityConfigCallback.current}
          viewabilityConfig={viewabilityConfig}
          pagingEnabled={true} // Alternative to snapToInterval for full-screen items
          // snapToInterval={itemWidth}
          decelerationRate="fast"
          snapToAlignment={"center"} // or 'start', 'end'
          showsHorizontalScrollIndicator={false}
          //don't scroll if the song has has no like status
          scrollEnabled={shouldScrollEnable}
          getItemLayout={(data, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  horizontal: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
  },
});
