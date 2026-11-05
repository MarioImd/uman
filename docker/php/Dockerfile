FROM php:8.1-apache
RUN docker-php-ext-install pdo_mysql \
 && a2enmod rewrite headers \
 && sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf \
 && printf 'post_max_size=16M\nmemory_limit=128M\n' > /usr/local/etc/php/conf.d/umam.ini
