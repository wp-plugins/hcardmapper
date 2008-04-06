<?php
/*
Plugin Name: WP-hCardMapping
Plugin URI: http://notizblog.org/projects/wp-hcard-commenting/
Description: This is a special version of <a href="http://notizblog.org/projects/wp-hcard-commenting/">wp-hcard-commenting</a>, using the <a href="http://lib.omnia-computing.de/hcardmapper">hCardMapper</a> by <a href="http://www.omnia-computing.de">Gordon Oheim</a>.
Author: Matthias Pfefferle
Author URI: http://notizblog.org
Version: 0.1
*/

if (!class_exists('hKit')) {
  include_once('lib/hkit.class.php');
}

if (isset($wp_version)) {
  add_filter('query_vars', array('hCardId', 'query_vars'));
  add_action('parse_query', array('hCardId', 'parse_hcard'));
  add_action('init', array('hCardId', 'init'));
  //add_filter('generate_rewrite_rules', array('hCardId', 'rewrite_rules'));

  add_action('wp_head', array('hCardId', 'head'), 10);
}

class hCardId {

  function hCardId() { }

  function init() {
    global $wp_rewrite;
    $wp_rewrite->flush_rules();

    //wp_enqueue_script( 'prototype', 'scriptaculous-effects' );
    wp_enqueue_script( 'hcard-mapper', hCardId::get_path() . '/js/hcardmapper.js', array('prototype', 'scriptaculous-effects') );
  }

  /**
   * Define the rewrite rules
   */
  function rewrite_rules($wp_rewrite) {
    $new_rules = array(
      'hcard_url/(.+)' => 'index.php?hcard_url=' . $wp_rewrite->preg_index(1)
    );
    $wp_rewrite->rules = $new_rules + $wp_rewrite->rules;
  }

  function parse_hcard() {
  	global $wp_query, $wp_version;

  	$url = $wp_query->query_vars['hcard_url'];

    $status = '200';
    $ct = 'text/plain';

    if( isset( $url )) {
      if (phpversion() > 5) {
        $hkit = new hKit();
        $result = $hkit->getByURL('hcard', $url);
      } else {
        $hcard = file_get_contents('http://tools.microformatic.com/query/php/hkit/' . urldecode($url));
        $result = unserialize ($hcard);
      }

      $repcard = null;

      if (count($result) != 0) {
        if (count($result) == 1) {
          $repcard = $result[0];
        } else {
          foreach ($result as $card) {
            if (array_search($url, $card) == true || @$card['uid'] == $url) {
              $repcard = $card;
            }
          }
        }

        if (!$repcard) {
          $repcard = $result[0];
        }

        $o = hCardId::create_json($repcard);
        $ct = 'application/x-javascript';
      } else {
        $o = '404 Not Found';
        $status = '404';
      }

      switch($status) {
        case '400':
          $header = "HTTP/1.0 400 Bad Request";
          break;
        case '404':
          $header = "HTTP/1.0 404 Not Found";
          break;
        case '200':
          $header = 'Content-type: '.$ct.' charset=utf-8';
          break;
        default:
          $header = "HTTP/1.0 200 OK";
          break;
      }

      header($header);
      echo $o;
      exit;
    }
  }

  function create_json($hcard) {
    // if there is more than one url
    $hcard["url"] = hCardId::get_url($hcard["url"]);
    // if there is more than one email address, take the first
    $hcard["email"] = is_array($hcard["email"]) ? $hcard["email"][0] : $hcard["email"];

    return json_encode($hcard);
  }

  function get_url($url) {
    if (is_array($url)) {
      /*foreach ($url as $u) {
        echo $u;
        if (preg_match_all("((http://|https://)[^ ]+)", $u, $match)) {
          return $u;
        }
      }*/
      return $url[0];
    } else {
      return $url;
    }
  }

  /**
   * Set the path for the plugin.
   **/
  function get_path() {
    $plugin = 'wp-hcard-commenting';

    $base = plugin_basename(__FILE__);
    if ($base != __FILE__) {
      $plugin = dirname($base);
    }

    $path = '/wp-content/plugins/'.$plugin;

    return get_option('siteurl').$path;
  }

  /**
   * Include internal stylesheet.
   *
   * @action: wp_head, login_head
   **/
  function head() {
    if (is_single()) {
      $css_path = hCardId::get_path() . '/css/hcardmapper.css';
      echo '<link rel="stylesheet" type="text/css" href="'.$css_path.'" />';

      wp_print_scripts( array( 'prototype', 'scriptaculous-effects', 'hcard-mapper' ));
?>
  <script type="text/javascript">
    <!--
    Event.observe(window, 'load', function() {
      hcr = new com.omniacomputing.HCardMapper({
        register: true,
        proxy: '<?php echo parse_url(get_option('siteurl'), PHP_URL_PATH); ?>/index.php?hcard_url=',
        insertBelowEl: 'respond',
        loadIcon: '<?php echo hCardId::get_path(); ?>/img/ajax-loader.gif',
        mappings: {
          fn: 'author',
          email: 'email',
          url: 'url'
        }
      })
    });
    //-->
  </script>
<?php
    }
  }

  /**
   * Add 'hcard_url' as a valid query variables.
   */
  function query_vars($vars) {
    $vars[] = 'hcard_url';

    return $vars;
  }
}
?>
